/* jshint moz: true */
/* jshint esversion: 6 */

/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80 filetype=javascript: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Contributors:
 *     Zhanibek Adilbekov <zhanibek@archlinux.info>
 */

/**
 * This file includes the following constructors and global objects:
 *
 * DownloadList
 * Represents a collection of Download objects that can be viewed and managed by
 * the user interface, and persisted across sessions.
 *
 * DownloadCombinedList
 * Provides a unified, unordered list combining public and private downloads.
 *
 * DownloadSummary
 * Provides an aggregated view on the contents of a DownloadList.
 */

var {Cu, Ci, Cc} = require("chrome");

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Promise",
                                  "resource://gre/modules/Promise.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "Task",
                                  "resource://gre/modules/Task.jsm");

////////////////////////////////////////////////////////////////////////////////
//// DownloadSummary

/**
 * Provides an aggregated view on the contents of a DownloadList.
 */
function DownloadSummary()
{
  this._downloads = [];
  this._views = new Set();
}

DownloadSummary.prototype = {
  /**
   * Array of Download objects that are currently part of the summary.
   */
  _downloads: null,

  /**
   * Underlying DownloadList whose contents should be summarized.
   */
  _list: null,

  /**
   * This method may be called once to bind this object to a DownloadList.
   *
   * Views on the summarized data can be registered before this object is bound
   * to an actual list.  This allows the summary to be used without requiring
   * the initialization of the DownloadList first.
   *
   * @param aList
   *        Underlying DownloadList whose contents should be summarized.
   *
   * @return {Promise}
   * @resolves When the view on the underlying list has been registered.
   * @rejects JavaScript exception.
   */
  bindToList: function (aList)
  {
    if (this._list) {
      throw new Error("bindToList may be called only once.");
    }

    return aList.addView(this).then(() => {
      // Set the list reference only after addView has returned, so that we don't
      // send a notification to our views for each download that is added.
      this._list = aList;
      this._onListChanged();
    });
  },

  /**
   * Unbind from list
   *
   * @param aList
   *        Underlying DownloadList whose contents should be summarized.
   *
   * @return {Promise}
   * @resolves When the view on the underlying list has been registered.
   * @rejects JavaScript exception.
   */
  unbindFromList: function (aList)
  {
    if (!this._list) {
      throw new Error("There is no list to unbind.");
    }

    return aList.removeView(this).then(() => {
      // Set the list reference only after addView has returned, so that we don't
      // send a notification to our views for each download that is added.
      this._list = null;
      this._onListChanged();
    });
  },

  /**
   * Set of currently registered views.
   */
  _views: null,

  /**
   * Adds a view that will be notified of changes to the summary.  The newly
   * added view will receive an initial onSummaryChanged notification.
   *
   * @param aView
   *        The view object to add.  The following methods may be defined:
   *        {
   *          onSummaryChanged: function () {
   *            // Called after any property of the summary has changed.
   *          },
   *        }
   *
   * @return {Promise}
   * @resolves When the view has been registered and the onSummaryChanged
   *           notification has been sent.
   * @rejects JavaScript exception.
   */
  addView: function (aView)
  {
    this._views.add(aView);

    if ("onSummaryChanged" in aView) {
      try {
        aView.onSummaryChanged();
      } catch (ex) {
        Cu.reportError(ex);
      }
    }

    return Promise.resolve();
  },

  /**
   * Removes a view that was previously added using addView.
   *
   * @param aView
   *        The view object to remove.
   *
   * @return {Promise}
   * @resolves When the view has been removed.  At this point, the removed view
   *           will not receive any more notifications.
   * @rejects JavaScript exception.
   */
  removeView: function (aView)
  {
    this._views.delete(aView);

    return Promise.resolve();
  },

  /**
   * Indicates whether all the downloads are currently stopped.
   */
  allHaveStopped: true,

  /**
   * Indicates the total number of bytes to be transferred before completing all
   * the downloads that are currently in progress.
   *
   * For downloads that do not have a known final size, the number of bytes
   * currently transferred is reported as part of this property.
   *
   * This is zero if no downloads are currently in progress.
   */
  progressTotalBytes: 0,

  /**
   * Number of bytes currently transferred as part of all the downloads that are
   * currently in progress.
   *
   * This is zero if no downloads are currently in progress.
   */
  progressCurrentBytes: 0,

  /**
   * Number of downloads that are currently in progress.
   *
   * This is zero if no downloads are currently in progress.
   */
  currentDownloadsCount: 0,

  /**
   * This function is called when any change in the list of downloads occurs,
   * and will recalculate the summary and notify the views in case the
   * aggregated properties are different.
   */
  _onListChanged: function () {
    let allHaveStopped = true;
    let progressTotalBytes = 0;
    let progressCurrentBytes = 0;
    let currentDownloadsCount = 0;

    // Recalculate the aggregated state.  See the description of the individual
    // properties for an explanation of the summarization logic.
    for (let download of this._downloads) {
      if (!download.stopped) {
        allHaveStopped = false;
        currentDownloadsCount++;
        progressTotalBytes += download.hasProgress ? download.totalBytes
                                                   : download.currentBytes;
        progressCurrentBytes += download.currentBytes;
      }
    }

    // Exit now if the properties did not change.
    if (this.allHaveStopped == allHaveStopped &&
        this.progressTotalBytes == progressTotalBytes &&
        this.progressCurrentBytes == progressCurrentBytes &&
        this.currentDownloadsCount == currentDownloadsCount) {
      return;
    }

    this.allHaveStopped = allHaveStopped;
    this.progressTotalBytes = progressTotalBytes;
    this.progressCurrentBytes = progressCurrentBytes;
    this.currentDownloadsCount = currentDownloadsCount;

    // Notify all the views that our properties changed.
    for (let view of this._views) {
      try {
        if ("onSummaryChanged" in view) {
          view.onSummaryChanged();
        }
      } catch (ex) {
        Cu.reportError(ex);
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  //// DownloadList view

  onDownloadAdded: function (aDownload)
  {
    this._downloads.push(aDownload);
    if (this._list) {
      this._onListChanged();
    }
  },

  onDownloadChanged: function (aDownload)
  {
    this._onListChanged();
  },

  onDownloadRemoved: function (aDownload)
  {
    let index = this._downloads.indexOf(aDownload);
    if (index != -1) {
      this._downloads.splice(index, 1);
    }
    this._onListChanged();
  },
};


module.exports = DownloadSummary;
