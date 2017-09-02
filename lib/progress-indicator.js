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

var { Cu, Ci, Cc } = require("chrome");

var xapp = null;

const nsIXULRuntime         = Ci.nsIXULRuntime;

Cu.import("resource://gre/modules/Services.jsm");

var gProgressIndicator = null;

function ProgressIndicator() {
  console.log("Creating new progress indicator instance");
  if (gProgressIndicator) {
    throw "You can't create more than one progress indicator instance";
  }
}

ProgressIndicator.prototype = {
  _xid: 0,
  _loaded: false,

  get xid() {
    if (this._xid > 0)
      return this._xid;

    let pid = Cc["@mozilla.org/xre/app-info;1"]
                  .getService(nsIXULRuntime).processID;

    this._xid = xapp.xapp_lookup_xid_from_pid(pid);

    return this._xid;
  },

  setProgress: function PI_setProgress(progress) {
    xapp.set_xid_progress(this.xid, progress);
  },

  hide: function PI_hide() {
    xapp.set_xid_progress(this.xid, 0);
  },

  init: function PI_Init() {
    if (!this._loaded) {
      console.log("Loading required JS modules");

      if (xapp === null)
        xapp = require('./xapp.js');

      if (xapp) {
        console.warn("The required libraries aren't available to run this extension");
        this.destroy();
        gProgressIndicator = null;
        return false;
      }
      this._loaded = true;
      return true;
    }
  },

  destroy: function PI_destroy() {
    if (this._loaded) {
      this.hide();
      this._xid = 0;
    }
  }
};

module.exports = ProgressIndicator;
