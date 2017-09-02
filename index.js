/* jshint moz: true */

/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 *	 Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is unityfox
 *
 * The Initial Developer of the Original Code is
 * Chris Coulson
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *    Lockal <lockalsash@gmail.com>
 *    Chris Coulson <chrisccoulson@ubuntu.com>
 *    Zhanibek Adilbekov <zhanibek@archlinux.info>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var {Cu, Ci, Cc} = require("chrome");

Cu.import("resource://gre/modules/Downloads.jsm");
Cu.import("resource://gre/modules/Task.jsm");

var DownloadSummary = require("./lib/download-summary.js");
var ProgressIndicator = require("./lib/progress-indicator.js");

var summary = new DownloadSummary();
var indicator = new ProgressIndicator();

if (indicator.init())
{
  exports.main = function (options, callbacks) {
    Task.spawn(function () {
      let list = yield Downloads.getList(Downloads.ALL);
      summary.bindToList(list);

      let view = {
        summary: summary,
        onSummaryChanged: function () {
          if (summary.allHaveStopped) {
            indicator.hide();
            indicator.setCount(0);
            indicator.setProgress(0.0);
          }
          else {
            indicator.setCount(summary.currentDownloadsCount);
            indicator.setProgress(summary.progressCurrentBytes / summary.progressTotalBytes);
            indicator.show();
          }
        }
      };

      summary.addView(view);

    }).then(null, Cu.reportError);
  };
  exports.onUnload = function(reason) {
    Task.spawn(function () {
      let list = yield Downloads.getList(Downloads.ALL);

      summary.unbindFromList(list);
      summary._views.clear();
      indicator.destroy();

    }).then(null, Cu.reportError);

  };
}
