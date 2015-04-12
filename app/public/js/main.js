(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var App, IS_LIVE, view;

App = require('./App');


/*

WIP - this will ideally change to old format (above) when can figure it out
 */

IS_LIVE = false;

view = IS_LIVE ? {} : window || document;

view.CD = new App(IS_LIVE);

view.CD.init();



},{"./App":2}],2:[function(require,module,exports){
var Analytics, App, AppData, AppView, AuthManager, Facebook, GooglePlus, Locale, MediaQueries, Nav, Router, Share, Templates,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = require('./utils/Analytics');

AuthManager = require('./utils/AuthManager');

Share = require('./utils/Share');

Facebook = require('./utils/Facebook');

GooglePlus = require('./utils/GooglePlus');

Templates = require('./data/Templates');

Locale = require('./data/Locale');

Router = require('./router/Router');

Nav = require('./router/Nav');

AppData = require('./AppData');

AppView = require('./AppView');

MediaQueries = require('./utils/MediaQueries');

App = (function() {
  App.prototype.LIVE = null;

  App.prototype.BASE_URL = window.config.hostname;

  App.prototype.localeCode = window.config.localeCode;

  App.prototype.objReady = 0;

  App.prototype._toClean = ['objReady', 'setFlags', 'objectComplete', 'init', 'initObjects', 'initSDKs', 'initApp', 'go', 'cleanup', '_toClean'];

  function App(LIVE) {
    this.LIVE = LIVE;
    this.cleanup = __bind(this.cleanup, this);
    this.go = __bind(this.go, this);
    this.initApp = __bind(this.initApp, this);
    this.initSDKs = __bind(this.initSDKs, this);
    this.initObjects = __bind(this.initObjects, this);
    this.init = __bind(this.init, this);
    this.objectComplete = __bind(this.objectComplete, this);
    this.setFlags = __bind(this.setFlags, this);
    return null;
  }

  App.prototype.setFlags = function() {
    var ua;
    ua = window.navigator.userAgent.toLowerCase();
    MediaQueries.setup();
    this.IS_ANDROID = ua.indexOf('android') > -1;
    this.IS_FIREFOX = ua.indexOf('firefox') > -1;
    this.IS_CHROME_IOS = ua.match('crios') ? true : false;
    return null;
  };

  App.prototype.objectComplete = function() {
    this.objReady++;
    if (this.objReady >= 4) {
      this.initApp();
    }
    return null;
  };

  App.prototype.init = function() {
    this.initObjects();
    return null;
  };

  App.prototype.initObjects = function() {
    this.templates = new Templates("/data/templates" + (this.LIVE ? '.min' : '') + ".xml", this.objectComplete);
    this.locale = new Locale("/data/locales/strings.json", this.objectComplete);
    this.analytics = new Analytics("/data/tracking.json", this.objectComplete);
    this.appData = new AppData(this.objectComplete);
    return null;
  };

  App.prototype.initSDKs = function() {
    Facebook.load();
    GooglePlus.load();
    return null;
  };

  App.prototype.initApp = function() {
    this.setFlags();

    /* Starts application */
    this.appView = new AppView;
    this.router = new Router;
    this.nav = new Nav;
    this.auth = new AuthManager;
    this.share = new Share;
    this.go();
    this.initSDKs();
    return null;
  };

  App.prototype.go = function() {

    /* After everything is loaded, kicks off website */
    this.appView.render();

    /* remove redundant initialisation methods / properties */
    this.cleanup();
    return null;
  };

  App.prototype.cleanup = function() {
    var fn, _i, _len, _ref;
    _ref = this._toClean;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      fn = _ref[_i];
      this[fn] = null;
      delete this[fn];
    }
    return null;
  };

  return App;

})();

module.exports = App;



},{"./AppData":3,"./AppView":4,"./data/Locale":10,"./data/Templates":11,"./router/Nav":17,"./router/Router":18,"./utils/Analytics":19,"./utils/AuthManager":20,"./utils/Facebook":22,"./utils/GooglePlus":23,"./utils/MediaQueries":24,"./utils/Share":26}],3:[function(require,module,exports){
var API, AbstractData, AppData, DoodlesCollection, Requester,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('./data/AbstractData');

Requester = require('./utils/Requester');

API = require('./data/API');

DoodlesCollection = require('./collections/doodles/DoodlesCollection');

AppData = (function(_super) {
  __extends(AppData, _super);

  AppData.prototype.callback = null;

  function AppData(callback) {
    this.callback = callback;
    this.onStartDataReceived = __bind(this.onStartDataReceived, this);
    this.getStartData = __bind(this.getStartData, this);

    /*
    
    add all data classes here
     */
    AppData.__super__.constructor.call(this);
    this.doodles = new DoodlesCollection;
    this.getStartData();
    return null;
  }


  /*
  get app bootstrap data - embed in HTML or API endpoint
   */

  AppData.prototype.getStartData = function() {
    var r;
    if (true) {
      r = Requester.request({
        url: this.CD().BASE_URL + '/data/_DUMMY/doodles.json',
        type: 'GET'
      });
      r.done(this.onStartDataReceived);
      r.fail((function(_this) {
        return function() {

          /*
          this is only temporary, while there is no bootstrap data here, normally would handle error / fail
           */
          return typeof _this.callback === "function" ? _this.callback() : void 0;
        };
      })(this));
    } else {
      if (typeof this.callback === "function") {
        this.callback();
      }
    }
    return null;
  };

  AppData.prototype.onStartDataReceived = function(data) {
    console.log("onStartDataReceived : (data) =>", data);
    this.doodles.add(data.doodles);

    /*
    
    bootstrap data received, app ready to go
     */
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  return AppData;

})(AbstractData);

module.exports = AppData;



},{"./collections/doodles/DoodlesCollection":7,"./data/API":8,"./data/AbstractData":9,"./utils/Requester":25}],4:[function(require,module,exports){
var AbstractView, AppView, Footer, Header, ModalManager, Preloader, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./view/AbstractView');

Preloader = require('./view/base/Preloader');

Header = require('./view/base/Header');

Wrapper = require('./view/base/Wrapper');

Footer = require('./view/base/Footer');

ModalManager = require('./view/modals/_ModalManager');

AppView = (function(_super) {
  __extends(AppView, _super);

  AppView.prototype.template = 'main';

  AppView.prototype.$window = null;

  AppView.prototype.$body = null;

  AppView.prototype.wrapper = null;

  AppView.prototype.footer = null;

  AppView.prototype.dims = {
    w: null,
    h: null,
    o: null,
    c: null
  };

  AppView.prototype.events = {
    'click a': 'linkManager'
  };

  AppView.prototype.EVENT_UPDATE_DIMENSIONS = 'EVENT_UPDATE_DIMENSIONS';

  AppView.prototype.MOBILE_WIDTH = 700;

  AppView.prototype.MOBILE = 'mobile';

  AppView.prototype.NON_MOBILE = 'non_mobile';

  function AppView() {
    this.handleExternalLink = __bind(this.handleExternalLink, this);
    this.navigateToUrl = __bind(this.navigateToUrl, this);
    this.linkManager = __bind(this.linkManager, this);
    this.getDims = __bind(this.getDims, this);
    this.onResize = __bind(this.onResize, this);
    this.begin = __bind(this.begin, this);
    this.onAllRendered = __bind(this.onAllRendered, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.render = __bind(this.render, this);
    this.enableTouch = __bind(this.enableTouch, this);
    this.disableTouch = __bind(this.disableTouch, this);
    this.$window = $(window);
    this.$body = $('body').eq(0);
    AppView.__super__.constructor.call(this);
  }

  AppView.prototype.disableTouch = function() {
    this.$window.on('touchmove', this.onTouchMove);
  };

  AppView.prototype.enableTouch = function() {
    this.$window.off('touchmove', this.onTouchMove);
  };

  AppView.prototype.onTouchMove = function(e) {
    e.preventDefault();
  };

  AppView.prototype.render = function() {
    this.bindEvents();
    this.preloader = new Preloader;
    this.modalManager = new ModalManager;
    this.header = new Header;
    this.wrapper = new Wrapper;
    this.footer = new Footer;
    this.addChild(this.header).addChild(this.wrapper).addChild(this.footer);
    this.preloader.show((function(_this) {
      return function() {
        return _this.header.animateTextIn();
      };
    })(this));
    this.onAllRendered();
  };

  AppView.prototype.bindEvents = function() {
    this.on('allRendered', this.onAllRendered);
    this.onResize();
    this.onResize = _.debounce(this.onResize, 300);
    this.$window.on('resize orientationchange', this.onResize);
  };

  AppView.prototype.onAllRendered = function() {
    this.$body.prepend(this.$el);
    this.begin();
  };

  AppView.prototype.begin = function() {
    this.trigger('start');
    this.CD().router.start();
  };

  AppView.prototype.onResize = function() {
    this.getDims();
  };

  AppView.prototype.getDims = function() {
    var h, w;
    w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    h = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    this.dims = {
      w: w,
      h: h,
      o: h > w ? 'portrait' : 'landscape',
      c: w <= this.MOBILE_WIDTH ? this.MOBILE : this.NON_MOBILE
    };
    this.trigger(this.EVENT_UPDATE_DIMENSIONS, this.dims);
  };

  AppView.prototype.linkManager = function(e) {
    var href;
    href = $(e.currentTarget).attr('href');
    if (!href) {
      return false;
    }
    this.navigateToUrl(href, e);
  };

  AppView.prototype.navigateToUrl = function(href, e) {
    var route, section;
    if (e == null) {
      e = null;
    }
    route = href.match(this.CD().BASE_URL) ? href.split(this.CD().BASE_URL)[1] : href;
    section = route.charAt(0) === '/' ? route.split('/')[1].split('/')[0] : route.split('/')[0];
    if (this.CD().nav.getSection(section)) {
      if (e != null) {
        e.preventDefault();
      }
      this.CD().router.navigateTo(route);
    } else {
      this.handleExternalLink(href);
    }
  };

  AppView.prototype.handleExternalLink = function(data) {
    console.log("handleExternalLink : (data) => ");

    /*
    
    bind tracking events if necessary
     */
  };

  return AppView;

})(AbstractView);

module.exports = AppView;



},{"./view/AbstractView":27,"./view/base/Footer":30,"./view/base/Header":31,"./view/base/Preloader":32,"./view/base/Wrapper":33,"./view/modals/_ModalManager":39}],5:[function(require,module,exports){
var AbstractCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = (function(_super) {
  __extends(AbstractCollection, _super);

  function AbstractCollection() {
    this.CD = __bind(this.CD, this);
    return AbstractCollection.__super__.constructor.apply(this, arguments);
  }

  AbstractCollection.prototype.CD = function() {
    return window.CD;
  };

  return AbstractCollection;

})(Backbone.Collection);

module.exports = AbstractCollection;



},{}],6:[function(require,module,exports){
var TemplateModel, TemplatesCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = require('../../models/core/TemplateModel');

TemplatesCollection = (function(_super) {
  __extends(TemplatesCollection, _super);

  function TemplatesCollection() {
    return TemplatesCollection.__super__.constructor.apply(this, arguments);
  }

  TemplatesCollection.prototype.model = TemplateModel;

  return TemplatesCollection;

})(Backbone.Collection);

module.exports = TemplatesCollection;



},{"../../models/core/TemplateModel":15}],7:[function(require,module,exports){
var AbstractCollection, DoodleModel, DoodlesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractCollection = require('../AbstractCollection');

DoodleModel = require('../../models/doodle/DoodleModel');

DoodlesCollection = (function(_super) {
  __extends(DoodlesCollection, _super);

  function DoodlesCollection() {
    this.getDoodleBySlug = __bind(this.getDoodleBySlug, this);
    return DoodlesCollection.__super__.constructor.apply(this, arguments);
  }

  DoodlesCollection.prototype.model = DoodleModel;

  DoodlesCollection.prototype.getDoodleBySlug = function(slug) {
    var doodle;
    doodle = this.findWhere({
      slug: slug
    });
    if (!doodle) {
      throw new Error("y u no doodle?");
    }
    return doodle;
  };

  return DoodlesCollection;

})(AbstractCollection);

module.exports = DoodlesCollection;



},{"../../models/doodle/DoodleModel":16,"../AbstractCollection":5}],8:[function(require,module,exports){
var API, APIRouteModel;

APIRouteModel = require('../models/core/APIRouteModel');

API = (function() {
  function API() {}

  API.model = new APIRouteModel;

  API.getContants = function() {
    return {

      /* add more if we wanna use in API strings */
      BASE_URL: API.CD().BASE_URL
    };
  };

  API.get = function(name, vars) {
    vars = $.extend(true, vars, API.getContants());
    return API.supplantString(API.model.get(name), vars);
  };

  API.supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      return r = vals[b] || (typeof vals[b] === 'number' ? vals[b].toString() : '');
    });
    if (typeof r === "string" || typeof r === "number") {
      return r;
    } else {
      return a;
    }
  };

  API.CD = function() {
    return window.CD;
  };

  return API;

})();

module.exports = API;



},{"../models/core/APIRouteModel":13}],9:[function(require,module,exports){
var AbstractData,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

AbstractData = (function() {
  function AbstractData() {
    this.CD = __bind(this.CD, this);
    _.extend(this, Backbone.Events);
    return null;
  }

  AbstractData.prototype.CD = function() {
    return window.CD;
  };

  return AbstractData;

})();

module.exports = AbstractData;



},{}],10:[function(require,module,exports){
var API, Locale, LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

LocalesModel = require('../models/core/LocalesModel');

API = require('../data/API');


/*
 * Locale Loader #

Fires back an event when complete
 */

Locale = (function() {
  Locale.prototype.lang = null;

  Locale.prototype.data = null;

  Locale.prototype.callback = null;

  Locale.prototype.backup = null;

  Locale.prototype["default"] = 'en-gb';

  function Locale(data, cb) {
    this.getLocaleImage = __bind(this.getLocaleImage, this);
    this.get = __bind(this.get, this);
    this.loadBackup = __bind(this.loadBackup, this);
    this.onSuccess = __bind(this.onSuccess, this);
    this.getLang = __bind(this.getLang, this);

    /* start Locale Loader, define locale based on browser language */
    this.callback = cb;
    this.backup = data;
    this.lang = this.getLang();
    if (API.get('locale', {
      code: this.lang
    })) {
      $.ajax({
        url: API.get('locale', {
          code: this.lang
        }),
        type: 'GET',
        success: this.onSuccess,
        error: this.loadBackup
      });
    } else {
      this.loadBackup();
    }
    null;
  }

  Locale.prototype.getLang = function() {
    var lang;
    if (window.location.search && window.location.search.match('lang=')) {
      lang = window.location.search.split('lang=')[1].split('&')[0];
    } else if (window.config.localeCode) {
      lang = window.config.localeCode;
    } else {
      lang = this["default"];
    }
    return lang;
  };

  Locale.prototype.onSuccess = function(event) {

    /* Fires back an event once it's complete */
    var d;
    d = null;
    if (event.responseText) {
      d = JSON.parse(event.responseText);
    } else {
      d = event;
    }
    this.data = new LocalesModel(d);
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };

  Locale.prototype.loadBackup = function() {

    /* When API not available, tries to load the static .txt locale */
    $.ajax({
      url: this.backup,
      dataType: 'json',
      complete: this.onSuccess,
      error: (function(_this) {
        return function() {
          return console.log('error on loading backup');
        };
      })(this)
    });
    return null;
  };

  Locale.prototype.get = function(id) {

    /* get String from locale
    + id : string id of the Localised String
     */
    return this.data.getString(id);
  };

  Locale.prototype.getLocaleImage = function(url) {
    return window.config.CDN + "/images/locale/" + window.config.localeCode + "/" + url;
  };

  return Locale;

})();

module.exports = Locale;



},{"../data/API":8,"../models/core/LocalesModel":14}],11:[function(require,module,exports){
var TemplateModel, Templates, TemplatesCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

TemplateModel = require('../models/core/TemplateModel');

TemplatesCollection = require('../collections/core/TemplatesCollection');

Templates = (function() {
  Templates.prototype.templates = null;

  Templates.prototype.cb = null;

  function Templates(templates, callback) {
    this.get = __bind(this.get, this);
    this.parseXML = __bind(this.parseXML, this);
    this.cb = callback;
    $.ajax({
      url: templates,
      success: this.parseXML
    });
    null;
  }

  Templates.prototype.parseXML = function(data) {
    var temp;
    temp = [];
    $(data).find('template').each(function(key, value) {
      var $value;
      $value = $(value);
      return temp.push(new TemplateModel({
        id: $value.attr('id').toString(),
        text: $.trim($value.text())
      }));
    });
    this.templates = new TemplatesCollection(temp);
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Templates.prototype.get = function(id) {
    var t;
    t = this.templates.where({
      id: id
    });
    t = t[0].get('text');
    return $.trim(t);
  };

  return Templates;

})();

module.exports = Templates;



},{"../collections/core/TemplatesCollection":6,"../models/core/TemplateModel":15}],12:[function(require,module,exports){
var AbstractModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = (function(_super) {
  __extends(AbstractModel, _super);

  function AbstractModel(attrs, option) {
    this.CD = __bind(this.CD, this);
    this._filterAttrs = __bind(this._filterAttrs, this);
    attrs = this._filterAttrs(attrs);
    return Backbone.DeepModel.apply(this, arguments);
  }

  AbstractModel.prototype.set = function(attrs, options) {
    options || (options = {});
    attrs = this._filterAttrs(attrs);
    options.data = JSON.stringify(attrs);
    return Backbone.DeepModel.prototype.set.call(this, attrs, options);
  };

  AbstractModel.prototype._filterAttrs = function(attrs) {
    return attrs;
  };

  AbstractModel.prototype.CD = function() {
    return window.CD;
  };

  return AbstractModel;

})(Backbone.DeepModel);

module.exports = AbstractModel;



},{}],13:[function(require,module,exports){
var APIRouteModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

APIRouteModel = (function(_super) {
  __extends(APIRouteModel, _super);

  function APIRouteModel() {
    return APIRouteModel.__super__.constructor.apply(this, arguments);
  }

  APIRouteModel.prototype.defaults = {
    start: "",
    locale: "",
    user: {
      login: "{{ BASE_URL }}/api/user/login",
      register: "{{ BASE_URL }}/api/user/register",
      password: "{{ BASE_URL }}/api/user/password",
      update: "{{ BASE_URL }}/api/user/update",
      logout: "{{ BASE_URL }}/api/user/logout",
      remove: "{{ BASE_URL }}/api/user/remove"
    }
  };

  return APIRouteModel;

})(Backbone.DeepModel);

module.exports = APIRouteModel;



},{}],14:[function(require,module,exports){
var LocalesModel,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

LocalesModel = (function(_super) {
  __extends(LocalesModel, _super);

  function LocalesModel() {
    this.getString = __bind(this.getString, this);
    this.get_language = __bind(this.get_language, this);
    return LocalesModel.__super__.constructor.apply(this, arguments);
  }

  LocalesModel.prototype.defaults = {
    code: null,
    language: null,
    strings: null
  };

  LocalesModel.prototype.get_language = function() {
    return this.get('language');
  };

  LocalesModel.prototype.getString = function(id) {
    var a, e, k, v, _ref, _ref1;
    _ref = this.get('strings');
    for (k in _ref) {
      v = _ref[k];
      _ref1 = v['strings'];
      for (a in _ref1) {
        e = _ref1[a];
        if (a === id) {
          return e;
        }
      }
    }
    console.warn("Locales -> not found string: " + id);
    return null;
  };

  return LocalesModel;

})(Backbone.Model);

module.exports = LocalesModel;



},{}],15:[function(require,module,exports){
var TemplateModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

TemplateModel = (function(_super) {
  __extends(TemplateModel, _super);

  function TemplateModel() {
    return TemplateModel.__super__.constructor.apply(this, arguments);
  }

  TemplateModel.prototype.defaults = {
    id: "",
    text: ""
  };

  return TemplateModel;

})(Backbone.Model);

module.exports = TemplateModel;



},{}],16:[function(require,module,exports){
var AbstractModel, DoodleModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModel = require('../AbstractModel');

DoodleModel = (function(_super) {
  __extends(DoodleModel, _super);

  function DoodleModel() {
    return DoodleModel.__super__.constructor.apply(this, arguments);
  }

  DoodleModel.prototype.defaults = {};

  return DoodleModel;

})(AbstractModel);

module.exports = DoodleModel;



},{"../AbstractModel":12}],17:[function(require,module,exports){
var AbstractView, Nav, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../view/AbstractView');

Router = require('./Router');

Nav = (function(_super) {
  __extends(Nav, _super);

  Nav.EVENT_CHANGE_VIEW = 'EVENT_CHANGE_VIEW';

  Nav.EVENT_CHANGE_SUB_VIEW = 'EVENT_CHANGE_SUB_VIEW';

  Nav.prototype.sections = null;

  Nav.prototype.current = {
    area: null,
    sub: null,
    ter: null
  };

  Nav.prototype.previous = {
    area: null,
    sub: null,
    ter: null
  };

  function Nav() {
    this.setPageTitle = __bind(this.setPageTitle, this);
    this.changeView = __bind(this.changeView, this);
    this.getSection = __bind(this.getSection, this);
    this.sections = window.config.routes;
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.changeView);
    return false;
  }

  Nav.prototype.getSection = function(section) {
    var sectionName, uri, _ref;
    if (section === '') {
      return true;
    }
    _ref = this.sections;
    for (sectionName in _ref) {
      uri = _ref[sectionName];
      if (uri === section) {
        return sectionName;
      }
    }
    return false;
  };

  Nav.prototype.changeView = function(area, sub, ter, params) {
    this.previous = this.current;
    this.current = {
      area: area,
      sub: sub,
      ter: ter
    };
    if (this.previous.area && this.previous.area === this.current.area) {
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    } else {
      this.trigger(Nav.EVENT_CHANGE_VIEW, this.previous, this.current);
      this.trigger(Nav.EVENT_CHANGE_SUB_VIEW, this.current);
    }
    if (this.CD().appView.modalManager.isOpen()) {
      this.CD().appView.modalManager.hideOpenModal();
    }
    this.setPageTitle(area, sub, ter);
    return null;
  };

  Nav.prototype.setPageTitle = function(area, sub, ter) {
    var title;
    title = "PAGE TITLE HERE - LOCALISE BASED ON URL";
    if (window.document.title !== title) {
      window.document.title = title;
    }
    return null;
  };

  return Nav;

})(AbstractView);

module.exports = Nav;



},{"../view/AbstractView":27,"./Router":18}],18:[function(require,module,exports){
var Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    this.CD = __bind(this.CD, this);
    this.navigateTo = __bind(this.navigateTo, this);
    this.hashChanged = __bind(this.hashChanged, this);
    this.start = __bind(this.start, this);
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.EVENT_HASH_CHANGED = 'EVENT_HASH_CHANGED';

  Router.prototype.FIRST_ROUTE = true;

  Router.prototype.routes = {
    '(/)(:area)(/:sub)(/:ter)(/)': 'hashChanged',
    '*actions': 'navigateTo'
  };

  Router.prototype.area = null;

  Router.prototype.sub = null;

  Router.prototype.ter = null;

  Router.prototype.params = null;

  Router.prototype.start = function() {
    Backbone.history.start({
      pushState: true,
      root: '/'
    });
    return null;
  };

  Router.prototype.hashChanged = function(area, sub, ter) {
    this.area = area != null ? area : null;
    this.sub = sub != null ? sub : null;
    this.ter = ter != null ? ter : null;
    console.log(">> EVENT_HASH_CHANGED @area = " + this.area + ", @sub = " + this.sub + ", @ter = " + this.ter + " <<");
    if (this.FIRST_ROUTE) {
      this.FIRST_ROUTE = false;
    }
    if (!this.area) {
      this.area = this.CD().nav.sections.HOME;
    }
    this.trigger(Router.EVENT_HASH_CHANGED, this.area, this.sub, this.ter, this.params);
    return null;
  };

  Router.prototype.navigateTo = function(where, trigger, replace, params) {
    if (where == null) {
      where = '';
    }
    if (trigger == null) {
      trigger = true;
    }
    if (replace == null) {
      replace = false;
    }
    this.params = params;
    if (where.charAt(0) !== "/") {
      where = "/" + where;
    }
    if (where.charAt(where.length - 1) !== "/") {
      where = "" + where + "/";
    }
    if (!trigger) {
      this.trigger(Router.EVENT_HASH_CHANGED, where, null, this.params);
      return;
    }
    this.navigate(where, {
      trigger: true,
      replace: replace
    });
    return null;
  };

  Router.prototype.CD = function() {
    return window.CD;
  };

  return Router;

})(Backbone.Router);

module.exports = Router;



},{}],19:[function(require,module,exports){

/*
Analytics wrapper
 */
var Analytics,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Analytics = (function() {
  Analytics.prototype.tags = null;

  Analytics.prototype.started = false;

  Analytics.prototype.attempts = 0;

  Analytics.prototype.allowedAttempts = 5;

  function Analytics(tags, callback) {
    this.callback = callback;
    this.track = __bind(this.track, this);
    this.onTagsReceived = __bind(this.onTagsReceived, this);
    $.getJSON(tags, this.onTagsReceived);
    return null;
  }

  Analytics.prototype.onTagsReceived = function(data) {
    this.tags = data;
    this.started = true;
    if (typeof this.callback === "function") {
      this.callback();
    }
    return null;
  };


  /*
  @param string id of the tracking tag to be pushed on Analytics
   */

  Analytics.prototype.track = function(param) {
    var arg, args, v, _i, _len;
    if (!this.started) {
      return;
    }
    if (param) {
      v = this.tags[param];
      if (v) {
        args = ['send', 'event'];
        for (_i = 0, _len = v.length; _i < _len; _i++) {
          arg = v[_i];
          args.push(arg);
        }
        if (window.ga) {
          ga.apply(null, args);
        } else if (this.attempts >= this.allowedAttempts) {
          this.started = false;
        } else {
          setTimeout((function(_this) {
            return function() {
              _this.track(param);
              return _this.attempts++;
            };
          })(this), 2000);
        }
      }
    }
    return null;
  };

  return Analytics;

})();

module.exports = Analytics;



},{}],20:[function(require,module,exports){
var AbstractData, AuthManager, Facebook, GooglePlus,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');

Facebook = require('../utils/Facebook');

GooglePlus = require('../utils/GooglePlus');

AuthManager = (function(_super) {
  __extends(AuthManager, _super);

  AuthManager.prototype.userData = null;

  AuthManager.prototype.process = false;

  AuthManager.prototype.processTimer = null;

  AuthManager.prototype.processWait = 5000;

  function AuthManager() {
    this.hideLoader = __bind(this.hideLoader, this);
    this.showLoader = __bind(this.showLoader, this);
    this.authCallback = __bind(this.authCallback, this);
    this.authFail = __bind(this.authFail, this);
    this.authSuccess = __bind(this.authSuccess, this);
    this.login = __bind(this.login, this);
    this.userData = this.CD().appData.USER;
    AuthManager.__super__.constructor.call(this);
    return null;
  }

  AuthManager.prototype.login = function(service, cb) {
    var $dataDfd;
    if (cb == null) {
      cb = null;
    }
    if (this.process) {
      return;
    }
    this.showLoader();
    this.process = true;
    $dataDfd = $.Deferred();
    switch (service) {
      case 'google':
        GooglePlus.login($dataDfd);
        break;
      case 'facebook':
        Facebook.login($dataDfd);
    }
    $dataDfd.done((function(_this) {
      return function(res) {
        return _this.authSuccess(service, res);
      };
    })(this));
    $dataDfd.fail((function(_this) {
      return function(res) {
        return _this.authFail(service, res);
      };
    })(this));
    $dataDfd.always((function(_this) {
      return function() {
        return _this.authCallback(cb);
      };
    })(this));

    /*
    		Unfortunately no callback is fired if user manually closes G+ login modal,
    		so this is to allow them to close window and then subsequently try to log in again...
     */
    this.processTimer = setTimeout(this.authCallback, this.processWait);
    return $dataDfd;
  };

  AuthManager.prototype.authSuccess = function(service, data) {
    return null;
  };

  AuthManager.prototype.authFail = function(service, data) {
    return null;
  };

  AuthManager.prototype.authCallback = function(cb) {
    if (cb == null) {
      cb = null;
    }
    if (!this.process) {
      return;
    }
    clearTimeout(this.processTimer);
    this.hideLoader();
    this.process = false;
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };


  /*
  	show / hide some UI indicator that we are waiting for social network to respond
   */

  AuthManager.prototype.showLoader = function() {
    return null;
  };

  AuthManager.prototype.hideLoader = function() {
    return null;
  };

  return AuthManager;

})(AbstractData);

module.exports = AuthManager;



},{"../data/AbstractData":9,"../utils/Facebook":22,"../utils/GooglePlus":23}],21:[function(require,module,exports){
var CodeWordTransitioner;

CodeWordTransitioner = (function() {
  function CodeWordTransitioner() {}

  CodeWordTransitioner.config = {
    MIN_WRONG_CHARS: 0,
    MAX_WRONG_CHARS: 3,
    MIN_CHAR_IN_DELAY: 40,
    MAX_CHAR_IN_DELAY: 70,
    MIN_CHAR_OUT_DELAY: 40,
    MAX_CHAR_OUT_DELAY: 70,
    CHARS: 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split(''),
    CHAR_TEMPLATE: "<span data-codetext-char=\"{{ char }}\">{{ char }}</span>"
  };

  CodeWordTransitioner._wordCache = {};

  CodeWordTransitioner._getWordFromCache = function($el) {
    var id, word;
    id = $el.attr('data-codeword-id');
    if (id && CodeWordTransitioner._wordCache[id]) {
      word = CodeWordTransitioner._wordCache[id];
    } else {
      CodeWordTransitioner._wrapChars($el);
      word = CodeWordTransitioner._addWordToCache($el);
    }
    return word;
  };

  CodeWordTransitioner._addWordToCache = function($el) {
    var chars, id;
    chars = [];
    $el.find('[data-codetext-char]').each(function(i, el) {
      var $charEl;
      $charEl = $(el);
      return chars.push({
        $el: $charEl,
        rightChar: $charEl.attr('data-codetext-char')
      });
    });
    id = _.uniqueId();
    $el.attr('data-codeword-id', id);
    CodeWordTransitioner._wordCache[id] = {
      word: _.pluck(chars, 'rightChar').join(''),
      $el: $el,
      chars: chars,
      visible: false
    };
    return CodeWordTransitioner._wordCache[id];
  };

  CodeWordTransitioner._wrapChars = function($el) {
    var char, chars, html, _i, _len;
    chars = $el.text().split('');
    html = [];
    for (_i = 0, _len = chars.length; _i < _len; _i++) {
      char = chars[_i];
      html.push(CodeWordTransitioner._supplantString(CodeWordTransitioner.config.CHAR_TEMPLATE, {
        char: char
      }));
    }
    $el.html(html.join(''));
    return null;
  };

  CodeWordTransitioner._isWordEmpty = function(word) {
    return null;
  };

  CodeWordTransitioner._prepareWord = function(word, target, charState) {
    var char, i, targetChar, _i, _len, _ref;
    if (charState == null) {
      charState = '';
    }
    _ref = word.chars;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      char = _ref[i];
      targetChar = (function() {
        switch (true) {
          case target === 'right':
            return char.rightChar;
          case target === 'wrong':
            return this._getRandomChar();
          default:
            return '';
        }
      }).call(CodeWordTransitioner);
      char.wrongChars = CodeWordTransitioner._getRandomWrongChars();
      char.targetChar = targetChar;
      char.charState = charState;
    }
    return null;
  };

  CodeWordTransitioner._getRandomWrongChars = function() {
    var charCount, chars, i, _i;
    chars = [];
    charCount = _.random(CodeWordTransitioner.config.MIN_WRONG_CHARS, CodeWordTransitioner.config.MAX_WRONG_CHARS);
    for (i = _i = 0; 0 <= charCount ? _i < charCount : _i > charCount; i = 0 <= charCount ? ++_i : --_i) {
      chars.push({
        char: CodeWordTransitioner._getRandomChar(),
        inDelay: _.random(CodeWordTransitioner.config.MIN_CHAR_IN_DELAY, CodeWordTransitioner.config.MAX_CHAR_IN_DELAY),
        outDelay: _.random(CodeWordTransitioner.config.MIN_CHAR_OUT_DELAY, CodeWordTransitioner.config.MAX_CHAR_OUT_DELAY)
      });
    }
    return chars;
  };

  CodeWordTransitioner._getRandomChar = function() {
    var char;
    char = CodeWordTransitioner.config.CHARS[_.random(0, CodeWordTransitioner.config.CHARS.length - 1)];
    return char;
  };

  CodeWordTransitioner._getLongestCharDuration = function(chars) {
    var char, i, longestTime, longestTimeIdx, time, wrongChar, _i, _j, _len, _len1, _ref;
    longestTime = 0;
    longestTimeIdx = 0;
    for (i = _i = 0, _len = chars.length; _i < _len; i = ++_i) {
      char = chars[i];
      time = 0;
      _ref = char.wrongChars;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        wrongChar = _ref[_j];
        time += wrongChar.inDelay + wrongChar.outDelay;
      }
      if (time > longestTime) {
        longestTime = time;
        longestTimeIdx = i;
      }
    }
    return longestTimeIdx;
  };

  CodeWordTransitioner._animateChars = function(word, sequential, cb) {
    var activeChar, args, char, i, longestCharIdx, _i, _len, _ref;
    activeChar = 0;
    if (sequential) {
      CodeWordTransitioner._animateChar(word.chars, activeChar, true, cb);
    } else {
      longestCharIdx = CodeWordTransitioner._getLongestCharDuration(word.chars);
      _ref = word.chars;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        char = _ref[i];
        args = [word.chars, i, false];
        if (i === longestCharIdx) {
          args.push(cb);
        }
        CodeWordTransitioner._animateChar.apply(CodeWordTransitioner, args);
      }
    }
    return null;
  };

  CodeWordTransitioner._animateChar = function(chars, idx, recurse, cb) {
    var char;
    char = chars[idx];
    if (recurse) {
      CodeWordTransitioner._animateWrongChars(char, function() {
        if (idx === chars.length - 1) {
          return CodeWordTransitioner._animateCharsDone(cb);
        } else {
          return CodeWordTransitioner._animateChar(chars, idx + 1, recurse, cb);
        }
      });
    } else {
      if (typeof cb === 'function') {
        CodeWordTransitioner._animateWrongChars(char, function() {
          return CodeWordTransitioner._animateCharsDone(cb);
        });
      } else {
        CodeWordTransitioner._animateWrongChars(char);
      }
    }
    return null;
  };

  CodeWordTransitioner._animateWrongChars = function(char, cb) {
    var wrongChar;
    char.$el.attr('data-codetext-char-state', char.charState);
    if (char.wrongChars.length) {
      wrongChar = char.wrongChars.shift();
      setTimeout(function() {
        char.$el.html(wrongChar.char);
        return setTimeout(function() {
          return CodeWordTransitioner._animateWrongChars(char, cb);
        }, wrongChar.outDelay);
      }, wrongChar.inDelay);
    } else {
      char.$el.html(char.targetChar);
      if (typeof cb === "function") {
        cb();
      }
    }
    return null;
  };

  CodeWordTransitioner._animateCharsDone = function(cb) {
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  CodeWordTransitioner._supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      r = vals[b];
      if (typeof r === "string" || typeof r === "number") {
        return r;
      } else {
        return a;
      }
    });
  };

  CodeWordTransitioner["in"] = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner["in"](_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    word.visible = true;
    CodeWordTransitioner._prepareWord(word, 'right', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.out = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.out(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    word.visible = false;
    CodeWordTransitioner._prepareWord(word, 'empty', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.scramble = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.scramble(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    CodeWordTransitioner._prepareWord(word, 'wrong', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  CodeWordTransitioner.unscramble = function($el, charState, sequential, cb) {
    var word, _$el, _i, _len;
    if (sequential == null) {
      sequential = false;
    }
    if (cb == null) {
      cb = null;
    }
    if (_.isArray($el)) {
      for (_i = 0, _len = $el.length; _i < _len; _i++) {
        _$el = $el[_i];
        CodeWordTransitioner.unscramble(_$el, charState, cb);
      }
      return;
    }
    word = CodeWordTransitioner._getWordFromCache($el);
    if (!word.visible) {
      return;
    }
    CodeWordTransitioner._prepareWord(word, 'right', charState);
    CodeWordTransitioner._animateChars(word, sequential, cb);
    return null;
  };

  return CodeWordTransitioner;

})();

module.exports = CodeWordTransitioner;

window.CodeWordTransitioner = CodeWordTransitioner;



},{}],22:[function(require,module,exports){
var AbstractData, Facebook,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Facebook SDK wrapper - load asynchronously, some helper methods
 */

Facebook = (function(_super) {
  __extends(Facebook, _super);

  function Facebook() {
    return Facebook.__super__.constructor.apply(this, arguments);
  }

  Facebook.url = '//connect.facebook.net/en_US/all.js';

  Facebook.permissions = 'email';

  Facebook.$dataDfd = null;

  Facebook.loaded = false;

  Facebook.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  Facebook.init = function() {
    Facebook.loaded = true;
    FB.init({
      appId: window.config.fb_app_id,
      status: false,
      xfbml: false
    });
    return null;
  };

  Facebook.login = function($dataDfd) {
    Facebook.$dataDfd = $dataDfd;
    if (!Facebook.loaded) {
      return Facebook.$dataDfd.reject('SDK not loaded');
    }
    FB.login(function(res) {
      if (res['status'] === 'connected') {
        return Facebook.getUserData(res['authResponse']['accessToken']);
      } else {
        return Facebook.$dataDfd.reject('no way jose');
      }
    }, {
      scope: Facebook.permissions
    });
    return null;
  };

  Facebook.getUserData = function(token) {
    var $meDfd, $picDfd, userData;
    userData = {};
    userData.access_token = token;
    $meDfd = $.Deferred();
    $picDfd = $.Deferred();
    FB.api('/me', function(res) {
      userData.full_name = res.name;
      userData.social_id = res.id;
      userData.email = res.email || false;
      return $meDfd.resolve();
    });
    FB.api('/me/picture', {
      'width': '200'
    }, function(res) {
      userData.profile_pic = res.data.url;
      return $picDfd.resolve();
    });
    $.when($meDfd, $picDfd).done(function() {
      return Facebook.$dataDfd.resolve(userData);
    });
    return null;
  };

  Facebook.share = function(opts, cb) {
    FB.ui({
      method: opts.method || 'feed',
      name: opts.name || '',
      link: opts.link || '',
      picture: opts.picture || '',
      caption: opts.caption || '',
      description: opts.description || ''
    }, function(response) {
      return typeof cb === "function" ? cb(response) : void 0;
    });
    return null;
  };

  return Facebook;

})(AbstractData);

module.exports = Facebook;



},{"../data/AbstractData":9}],23:[function(require,module,exports){
var AbstractData, GooglePlus,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('../data/AbstractData');


/*

Google+ SDK wrapper - load asynchronously, some helper methods
 */

GooglePlus = (function(_super) {
  __extends(GooglePlus, _super);

  function GooglePlus() {
    return GooglePlus.__super__.constructor.apply(this, arguments);
  }

  GooglePlus.url = 'https://apis.google.com/js/client:plusone.js';

  GooglePlus.params = {
    'clientid': null,
    'callback': null,
    'scope': 'https://www.googleapis.com/auth/userinfo.email',
    'cookiepolicy': 'none'
  };

  GooglePlus.$dataDfd = null;

  GooglePlus.loaded = false;

  GooglePlus.load = function() {

    /*
    		TO DO
    		include script loader with callback to :init
     */
    return null;
  };

  GooglePlus.init = function() {
    GooglePlus.loaded = true;
    GooglePlus.params['clientid'] = window.config.gp_app_id;
    GooglePlus.params['callback'] = GooglePlus.loginCallback;
    return null;
  };

  GooglePlus.login = function($dataDfd) {
    GooglePlus.$dataDfd = $dataDfd;
    if (GooglePlus.loaded) {
      gapi.auth.signIn(GooglePlus.params);
    } else {
      GooglePlus.$dataDfd.reject('SDK not loaded');
    }
    return null;
  };

  GooglePlus.loginCallback = function(res) {
    if (res['status']['signed_in']) {
      GooglePlus.getUserData(res['access_token']);
    } else if (res['error']['access_denied']) {
      GooglePlus.$dataDfd.reject('no way jose');
    }
    return null;
  };

  GooglePlus.getUserData = function(token) {
    gapi.client.load('plus', 'v1', function() {
      var request;
      request = gapi.client.plus.people.get({
        'userId': 'me'
      });
      return request.execute(function(res) {
        var userData;
        userData = {
          access_token: token,
          full_name: res.displayName,
          social_id: res.id,
          email: res.emails[0] ? res.emails[0].value : false,
          profile_pic: res.image.url
        };
        return GooglePlus.$dataDfd.resolve(userData);
      });
    });
    return null;
  };

  return GooglePlus;

})(AbstractData);

module.exports = GooglePlus;



},{"../data/AbstractData":9}],24:[function(require,module,exports){
var MediaQueries;

MediaQueries = (function() {
  function MediaQueries() {}

  MediaQueries.SMALL = "small";

  MediaQueries.IPAD = "ipad";

  MediaQueries.MEDIUM = "medium";

  MediaQueries.LARGE = "large";

  MediaQueries.EXTRA_LARGE = "extra-large";

  MediaQueries.setup = function() {
    MediaQueries.SMALL_BREAKPOINT = {
      name: "Small",
      breakpoints: [MediaQueries.SMALL]
    };
    MediaQueries.MEDIUM_BREAKPOINT = {
      name: "Medium",
      breakpoints: [MediaQueries.MEDIUM]
    };
    MediaQueries.LARGE_BREAKPOINT = {
      name: "Large",
      breakpoints: [MediaQueries.IPAD, MediaQueries.LARGE, MediaQueries.EXTRA_LARGE]
    };
    MediaQueries.BREAKPOINTS = [MediaQueries.SMALL_BREAKPOINT, MediaQueries.MEDIUM_BREAKPOINT, MediaQueries.LARGE_BREAKPOINT];
  };

  MediaQueries.getDeviceState = function() {
    return window.getComputedStyle(document.body, "after").getPropertyValue("content");
  };

  MediaQueries.getBreakpoint = function() {
    var i, state, _i, _ref;
    state = MediaQueries.getDeviceState();
    for (i = _i = 0, _ref = MediaQueries.BREAKPOINTS.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (MediaQueries.BREAKPOINTS[i].breakpoints.indexOf(state) > -1) {
        return MediaQueries.BREAKPOINTS[i].name;
      }
    }
    return "";
  };

  MediaQueries.isBreakpoint = function(breakpoint) {
    var i, _i, _ref;
    for (i = _i = 0, _ref = breakpoint.breakpoints.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      if (breakpoint.breakpoints[i] === MediaQueries.getDeviceState()) {
        return true;
      }
    }
    return false;
  };

  return MediaQueries;

})();

module.exports = MediaQueries;



},{}],25:[function(require,module,exports){

/*
 * Requester #

Wrapper for `$.ajax` calls
 */
var Requester;

Requester = (function() {
  function Requester() {}

  Requester.requests = [];

  Requester.request = function(data) {

    /*
    `data = {`<br>
    `  url         : String`<br>
    `  type        : "POST/GET/PUT"`<br>
    `  data        : Object`<br>
    `  dataType    : jQuery dataType`<br>
    `  contentType : String`<br>
    `}`
     */
    var r;
    r = $.ajax({
      url: data.url,
      type: data.type ? data.type : "POST",
      data: data.data ? data.data : null,
      dataType: data.dataType ? data.dataType : "json",
      contentType: data.contentType ? data.contentType : "application/x-www-form-urlencoded; charset=UTF-8",
      processData: data.processData !== null && data.processData !== void 0 ? data.processData : true
    });
    r.done(data.done);
    r.fail(data.fail);
    return r;
  };

  Requester.addImage = function(data, done, fail) {

    /*
    ** Usage: <br>
    `data = canvass.toDataURL("image/jpeg").slice("data:image/jpeg;base64,".length)`<br>
    `Requester.addImage data, "zoetrope", @done, @fail`
     */
    Requester.request({
      url: '/api/images/',
      type: 'POST',
      data: {
        image_base64: encodeURI(data)
      },
      done: done,
      fail: fail
    });
    return null;
  };

  Requester.deleteImage = function(id, done, fail) {
    Requester.request({
      url: '/api/images/' + id,
      type: 'DELETE',
      done: done,
      fail: fail
    });
    return null;
  };

  return Requester;

})();

module.exports = Requester;



},{}],26:[function(require,module,exports){

/*
Sharing class for non-SDK loaded social networks.
If SDK is loaded, and provides share methods, then use that class instead, eg. `Facebook.share` instead of `Share.facebook`
 */
var Share,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Share = (function() {
  Share.prototype.url = null;

  function Share() {
    this.CD = __bind(this.CD, this);
    this.weibo = __bind(this.weibo, this);
    this.renren = __bind(this.renren, this);
    this.twitter = __bind(this.twitter, this);
    this.facebook = __bind(this.facebook, this);
    this.tumblr = __bind(this.tumblr, this);
    this.pinterest = __bind(this.pinterest, this);
    this.plus = __bind(this.plus, this);
    this.openWin = __bind(this.openWin, this);
    this.url = this.CD().BASE_URL;
    return null;
  }

  Share.prototype.openWin = function(url, w, h) {
    var left, top;
    left = (screen.availWidth - w) >> 1;
    top = (screen.availHeight - h) >> 1;
    window.open(url, '', 'top=' + top + ',left=' + left + ',width=' + w + ',height=' + h + ',location=no,menubar=no');
    return null;
  };

  Share.prototype.plus = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("https://plus.google.com/share?url=" + url, 650, 385);
    return null;
  };

  Share.prototype.pinterest = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.pinterest.com/pin/create/button/?url=" + url + "&media=" + media + "&description=" + descr, 735, 310);
    return null;
  };

  Share.prototype.tumblr = function(url, media, descr) {
    url = encodeURIComponent(url || this.url);
    media = encodeURIComponent(media);
    descr = encodeURIComponent(descr);
    this.openWin("http://www.tumblr.com/share/photo?source=" + media + "&caption=" + descr + "&click_thru=" + url, 450, 430);
    return null;
  };

  Share.prototype.facebook = function(url, copy) {
    var decsr;
    if (copy == null) {
      copy = '';
    }
    url = encodeURIComponent(url || this.url);
    decsr = encodeURIComponent(copy);
    this.openWin("http://www.facebook.com/share.php?u=" + url + "&t=" + decsr, 600, 300);
    return null;
  };

  Share.prototype.twitter = function(url, copy) {
    var descr;
    if (copy == null) {
      copy = '';
    }
    url = encodeURIComponent(url || this.url);
    if (copy === '') {
      copy = this.CD().locale.get('seo_twitter_card_description');
    }
    descr = encodeURIComponent(copy);
    this.openWin("http://twitter.com/intent/tweet/?text=" + descr + "&url=" + url, 600, 300);
    return null;
  };

  Share.prototype.renren = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://share.renren.com/share/buttonshare.do?link=" + url, 600, 300);
    return null;
  };

  Share.prototype.weibo = function(url) {
    url = encodeURIComponent(url || this.url);
    this.openWin("http://service.weibo.com/share/share.php?url=" + url + "&language=zh_cn", 600, 300);
    return null;
  };

  Share.prototype.CD = function() {
    return window.CD;
  };

  return Share;

})();

module.exports = Share;



},{}],27:[function(require,module,exports){
var AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = (function(_super) {
  __extends(AbstractView, _super);

  function AbstractView() {
    this.CD = __bind(this.CD, this);
    this.dispose = __bind(this.dispose, this);
    this.callChildrenAndSelf = __bind(this.callChildrenAndSelf, this);
    this.callChildren = __bind(this.callChildren, this);
    this.triggerChildren = __bind(this.triggerChildren, this);
    this.removeAllChildren = __bind(this.removeAllChildren, this);
    this.muteAll = __bind(this.muteAll, this);
    this.unMuteAll = __bind(this.unMuteAll, this);
    this.CSSTranslate = __bind(this.CSSTranslate, this);
    this.mouseEnabled = __bind(this.mouseEnabled, this);
    this.onResize = __bind(this.onResize, this);
    this.remove = __bind(this.remove, this);
    this.replace = __bind(this.replace, this);
    this.addChild = __bind(this.addChild, this);
    this.render = __bind(this.render, this);
    this.update = __bind(this.update, this);
    this.init = __bind(this.init, this);
    return AbstractView.__super__.constructor.apply(this, arguments);
  }

  AbstractView.prototype.el = null;

  AbstractView.prototype.id = null;

  AbstractView.prototype.children = null;

  AbstractView.prototype.template = null;

  AbstractView.prototype.templateVars = null;

  AbstractView.prototype.initialize = function() {
    var tmpHTML;
    this.children = [];
    if (this.template) {
      tmpHTML = _.template(this.CD().templates.get(this.template));
      this.setElement(tmpHTML(this.templateVars));
    }
    if (this.id) {
      this.$el.attr('id', this.id);
    }
    if (this.className) {
      this.$el.addClass(this.className);
    }
    this.init();
    this.paused = false;
    return null;
  };

  AbstractView.prototype.init = function() {
    return null;
  };

  AbstractView.prototype.update = function() {
    return null;
  };

  AbstractView.prototype.render = function() {
    return null;
  };

  AbstractView.prototype.addChild = function(child, prepend) {
    var c, target;
    if (prepend == null) {
      prepend = false;
    }
    if (child.el) {
      this.children.push(child);
    }
    target = this.addToSelector ? this.$el.find(this.addToSelector).eq(0) : this.$el;
    c = child.el ? child.$el : child;
    if (!prepend) {
      target.append(c);
    } else {
      target.prepend(c);
    }
    return this;
  };

  AbstractView.prototype.replace = function(dom, child) {
    var c;
    if (child.el) {
      this.children.push(child);
    }
    c = child.el ? child.$el : child;
    this.$el.children(dom).replaceWith(c);
    return null;
  };

  AbstractView.prototype.remove = function(child) {
    var c;
    if (child == null) {
      return;
    }
    c = child.el ? child.$el : $(child);
    if (c && child.dispose) {
      child.dispose();
    }
    if (c && this.children.indexOf(child) !== -1) {
      this.children.splice(this.children.indexOf(child), 1);
    }
    c.remove();
    return null;
  };

  AbstractView.prototype.onResize = function(event) {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (child.onResize) {
        child.onResize();
      }
    }
    return null;
  };

  AbstractView.prototype.mouseEnabled = function(enabled) {
    this.$el.css({
      "pointer-events": enabled ? "auto" : "none"
    });
    return null;
  };

  AbstractView.prototype.CSSTranslate = function(x, y, value, scale) {
    var str;
    if (value == null) {
      value = '%';
    }
    if (Modernizr.csstransforms3d) {
      str = "translate3d(" + (x + value) + ", " + (y + value) + ", 0)";
    } else {
      str = "translate(" + (x + value) + ", " + (y + value) + ")";
    }
    if (scale) {
      str = "" + str + " scale(" + scale + ")";
    }
    return str;
  };

  AbstractView.prototype.unMuteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.unMute === "function") {
        child.unMute();
      }
      if (child.children.length) {
        child.unMuteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.muteAll = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      if (typeof child.mute === "function") {
        child.mute();
      }
      if (child.children.length) {
        child.muteAll();
      }
    }
    return null;
  };

  AbstractView.prototype.removeAllChildren = function() {
    var child, _i, _len, _ref;
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      this.remove(child);
    }
    return null;
  };

  AbstractView.prototype.triggerChildren = function(msg, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      child.trigger(msg);
      if (child.children.length) {
        this.triggerChildren(msg, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildren = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.callChildrenAndSelf = function(method, params, children) {
    var child, i, _i, _len;
    if (children == null) {
      children = this.children;
    }
    if (typeof this[method] === "function") {
      this[method](params);
    }
    for (i = _i = 0, _len = children.length; _i < _len; i = ++_i) {
      child = children[i];
      if (typeof child[method] === "function") {
        child[method](params);
      }
      if (child.children.length) {
        this.callChildren(method, params, child.children);
      }
    }
    return null;
  };

  AbstractView.prototype.supplantString = function(str, vals) {
    return str.replace(/{{ ([^{}]*) }}/g, function(a, b) {
      var r;
      r = vals[b];
      if (typeof r === "string" || typeof r === "number") {
        return r;
      } else {
        return a;
      }
    });
  };

  AbstractView.prototype.dispose = function() {

    /*
    		override on per view basis - unbind event handlers etc
     */
    return null;
  };

  AbstractView.prototype.CD = function() {
    return window.CD;
  };

  return AbstractView;

})(Backbone.View);

module.exports = AbstractView;



},{}],28:[function(require,module,exports){
var AbstractView, AbstractViewPage,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./AbstractView');

AbstractViewPage = (function(_super) {
  __extends(AbstractViewPage, _super);

  function AbstractViewPage() {
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.show = __bind(this.show, this);
    return AbstractViewPage.__super__.constructor.apply(this, arguments);
  }

  AbstractViewPage.prototype._shown = false;

  AbstractViewPage.prototype._listening = false;

  AbstractViewPage.prototype.show = function(cb) {
    if (!!this._shown) {
      return;
    }
    this._shown = true;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.addChild(this);
    this.callChildrenAndSelf('setListeners', 'on');

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'visible'
    });
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  AbstractViewPage.prototype.hide = function(cb) {
    if (!this._shown) {
      return;
    }
    this._shown = false;

    /*
    		CHANGE HERE - 'page' views are always in DOM - to save having to re-initialise gmap events (PITA). No longer require :dispose method
     */
    this.CD().appView.wrapper.remove(this);

    /* replace with some proper transition if we can */
    this.$el.css({
      'visibility': 'hidden'
    });
    if (typeof cb === "function") {
      cb();
    }
    return null;
  };

  AbstractViewPage.prototype.dispose = function() {
    this.callChildrenAndSelf('setListeners', 'off');
    return null;
  };

  AbstractViewPage.prototype.setListeners = function(setting) {
    if (setting === this._listening) {
      return;
    }
    this._listening = setting;
    return null;
  };

  return AbstractViewPage;

})(AbstractView);

module.exports = AbstractViewPage;



},{"./AbstractView":27}],29:[function(require,module,exports){
var AboutPageView, AbstractViewPage,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

AboutPageView = (function(_super) {
  __extends(AboutPageView, _super);

  AboutPageView.prototype.template = 'page-about';

  function AboutPageView() {
    this.templateVars = {
      desc: this.CD().locale.get("about_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    AboutPageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return AboutPageView;

})(AbstractViewPage);

module.exports = AboutPageView;



},{"../AbstractViewPage":28}],30:[function(require,module,exports){
var AbstractView, Footer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Footer = (function(_super) {
  __extends(Footer, _super);

  Footer.prototype.template = 'site-footer';

  function Footer() {
    this.templateVars = {};
    Footer.__super__.constructor.call(this);
    return null;
  }

  return Footer;

})(AbstractView);

module.exports = Footer;



},{"../AbstractView":27}],31:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, Header, Router,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Router = require('../../router/Router');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

Header = (function(_super) {
  __extends(Header, _super);

  Header.prototype.template = 'site-header';

  Header.prototype.FIRST_HASHCHANGE = true;

  function Header() {
    this.onWordLeave = __bind(this.onWordLeave, this);
    this.onWordEnter = __bind(this.onWordEnter, this);
    this.animateTextIn = __bind(this.animateTextIn, this);
    this.getSectionColour = __bind(this.getSectionColour, this);
    this.onAreaChange = __bind(this.onAreaChange, this);
    this.onHashChange = __bind(this.onHashChange, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      home: {
        label: this.CD().locale.get('header_logo_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.HOME
      },
      about: {
        label: this.CD().locale.get('header_about_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.ABOUT
      },
      contribute: {
        label: this.CD().locale.get('header_contribute_label'),
        url: this.CD().BASE_URL + '/' + this.CD().nav.sections.CONTRIBUTE
      },
      close_label: this.CD().locale.get('header_close_label'),
      info_label: this.CD().locale.get('header_info_label')
    };
    Header.__super__.constructor.call(this);
    this.bindEvents();
    return null;
  }

  Header.prototype.init = function() {
    this.$logo = this.$el.find('.logo__link');
    this.$navLinkAbout = this.$el.find('.site-nav__link').eq(0);
    this.$navLinkContribute = this.$el.find('.site-nav__link').eq(1);
    this.$infoBtn = this.$el.find('.info-btn');
    this.$closeBtn = this.$el.find('.close-btn');
    return null;
  };

  Header.prototype.bindEvents = function() {
    this.CD().router.on(Router.EVENT_HASH_CHANGED, this.onHashChange);
    this.$el.on('mouseenter', '[data-codeword]', this.onWordEnter);
    this.$el.on('mouseleave', '[data-codeword]', this.onWordLeave);
    return null;
  };

  Header.prototype.onHashChange = function(where) {
    if (this.FIRST_HASHCHANGE) {
      this.FIRST_HASHCHANGE = false;
      return;
    }
    this.onAreaChange(where);
    return null;
  };

  Header.prototype.onAreaChange = function(section) {
    var colour;
    colour = this.getSectionColour(section);
    this.$el.attr('data-section', section);
    CodeWordTransitioner["in"](this.$logo, colour);
    if (section === this.CD().nav.sections.HOME) {
      CodeWordTransitioner["in"]([this.$navLinkAbout, this.$navLinkContribute], colour);
      CodeWordTransitioner.out([this.$closeBtn, this.$infoBtn], colour);
    } else if (section === this.CD().nav.sections.DOODLES) {
      CodeWordTransitioner["in"]([this.$closeBtn, this.$infoBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute], colour);
    } else {
      CodeWordTransitioner["in"]([this.$closeBtn], colour);
      CodeWordTransitioner.out([this.$navLinkAbout, this.$navLinkContribute, this.$infoBtn], colour);
    }
    return null;
  };

  Header.prototype.getSectionColour = function(section) {
    var colour;
    section = section || this.CD().nav.current.area || 'home';
    colour = (function() {
      switch (section) {
        case 'home':
          return 'red';
        default:
          return 'blue';
      }
    })();
    return colour;
  };

  Header.prototype.animateTextIn = function() {
    this.onAreaChange(this.CD().nav.current.area);
    return null;
  };

  Header.prototype.onWordEnter = function(e) {
    var $el;
    $el = $(e.currentTarget);
    CodeWordTransitioner.scramble($el, this.getSectionColour());
    return null;
  };

  Header.prototype.onWordLeave = function(e) {
    var $el;
    $el = $(e.currentTarget);
    CodeWordTransitioner.unscramble($el, this.getSectionColour());
    return null;
  };

  return Header;

})(AbstractView);

module.exports = Header;



},{"../../router/Router":18,"../../utils/CodeWordTransitioner":21,"../AbstractView":27}],32:[function(require,module,exports){
var AbstractView, CodeWordTransitioner, Preloader,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

CodeWordTransitioner = require('../../utils/CodeWordTransitioner');

Preloader = (function(_super) {
  __extends(Preloader, _super);

  Preloader.prototype.cb = null;

  Preloader.prototype.TRANSITION_TIME = 0.5;

  Preloader.prototype.MIN_WRONG_CHARS = 0;

  Preloader.prototype.MAX_WRONG_CHARS = 4;

  Preloader.prototype.MIN_CHAR_IN_DELAY = 30;

  Preloader.prototype.MAX_CHAR_IN_DELAY = 100;

  Preloader.prototype.MIN_CHAR_OUT_DELAY = 30;

  Preloader.prototype.MAX_CHAR_OUT_DELAY = 100;

  Preloader.prototype.CHARS = 'abcdefhijklmnopqrstuvwxyz0123456789!?*()@£$%^&_-+=[]{}:;\'"\\|<>,./~`'.split('');

  function Preloader() {
    this.animateCharsOut = __bind(this.animateCharsOut, this);
    this.animateOut = __bind(this.animateOut, this);
    this.onHideComplete = __bind(this.onHideComplete, this);
    this.hide = __bind(this.hide, this);
    this.onShowComplete = __bind(this.onShowComplete, this);
    this.show = __bind(this.show, this);
    this.init = __bind(this.init, this);
    this.setElement($('#preloader'));
    Preloader.__super__.constructor.call(this);
    return null;
  }

  Preloader.prototype.init = function() {
    this.$codeWord = this.$el.find('[data-codeword]');
    return null;
  };

  Preloader.prototype.show = function(cb) {
    this.cb = cb;
    console.log("show : (@cb) =>");
    this.$el.addClass('show-preloader');
    CodeWordTransitioner["in"](this.$codeWord, 'white', false, this.hide);
    return null;
  };

  Preloader.prototype.onShowComplete = function() {
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.hide = function() {
    this.animateOut(this.onHideComplete);
    return null;
  };

  Preloader.prototype.onHideComplete = function() {
    this.$el.removeClass('show-preloader');
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.animateOut = function(cb) {
    setTimeout((function(_this) {
      return function() {
        return CodeWordTransitioner.scramble(_this.$codeWord, 'white', false, cb);
      };
    })(this), 2000);
    return null;
  };

  Preloader.prototype.animateCharsOut = function() {
    this.$codeWord.find('[data-codetext-char]').each((function(_this) {
      return function(i, el) {
        var $el, delay, displacement, rotation;
        $el = $(el);
        $el.addClass('hide-border');
        delay = 1 + (_.random(50, 200) / 1000);
        displacement = _.random(20, 30);
        rotation = (displacement / 30) * 50;
        rotation = Math.random() > 0.5 ? rotation : -rotation;
        return TweenLite.to($el, 1, {
          delay: delay,
          opacity: 0,
          y: displacement,
          rotation: "" + rotation + "deg",
          ease: Cubic.easeIn
        });
      };
    })(this));
    return null;
  };

  return Preloader;

})(AbstractView);

module.exports = Preloader;



},{"../../utils/CodeWordTransitioner":21,"../AbstractView":27}],33:[function(require,module,exports){
var AboutPageView, AbstractView, ContributePageView, DoodlePageView, HomeView, Nav, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

AboutPageView = require('../aboutPage/AboutPageView');

ContributePageView = require('../contributePage/ContributePageView');

DoodlePageView = require('../doodlePage/DoodlePageView');

Nav = require('../../router/Nav');

Wrapper = (function(_super) {
  __extends(Wrapper, _super);

  Wrapper.prototype.VIEW_TYPE_PAGE = 'page';

  Wrapper.prototype.VIEW_TYPE_MODAL = 'modal';

  Wrapper.prototype.template = 'wrapper';

  Wrapper.prototype.views = null;

  Wrapper.prototype.previousView = null;

  Wrapper.prototype.currentView = null;

  Wrapper.prototype.backgroundView = null;

  function Wrapper() {
    this.transitionViews = __bind(this.transitionViews, this);
    this.changeSubView = __bind(this.changeSubView, this);
    this.changeView = __bind(this.changeView, this);
    this.bindEvents = __bind(this.bindEvents, this);
    this.start = __bind(this.start, this);
    this.init = __bind(this.init, this);
    this.getViewByRoute = __bind(this.getViewByRoute, this);
    this.addClasses = __bind(this.addClasses, this);
    this.createClasses = __bind(this.createClasses, this);
    this.views = {
      home: {
        classRef: HomeView,
        route: this.CD().nav.sections.HOME,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      about: {
        classRef: AboutPageView,
        route: this.CD().nav.sections.ABOUT,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      contribute: {
        classRef: ContributePageView,
        route: this.CD().nav.sections.CONTRIBUTE,
        view: null,
        type: this.VIEW_TYPE_PAGE
      },
      doodle: {
        classRef: DoodlePageView,
        route: this.CD().nav.sections.DOODLES,
        view: null,
        type: this.VIEW_TYPE_PAGE
      }
    };
    this.createClasses();
    Wrapper.__super__.constructor.call(this);
    return null;
  }

  Wrapper.prototype.createClasses = function() {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      this.views[name].view = new this.views[name].classRef;
    }
    return null;
  };

  Wrapper.prototype.addClasses = function() {
    var data, name, _ref, _results;
    _ref = this.views;
    _results = [];
    for (name in _ref) {
      data = _ref[name];
      if (data.type === this.VIEW_TYPE_PAGE) {
        _results.push(this.addChild(data.view));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  null;

  Wrapper.prototype.getViewByRoute = function(route) {
    var data, name, _ref;
    _ref = this.views;
    for (name in _ref) {
      data = _ref[name];
      if (route === this.views[name].route) {
        return this.views[name];
      }
    }
    return null;
  };

  Wrapper.prototype.init = function() {
    this.CD().appView.on('start', this.start);
    return null;
  };

  Wrapper.prototype.start = function() {
    this.CD().appView.off('start', this.start);
    this.bindEvents();
    return null;
  };

  Wrapper.prototype.bindEvents = function() {
    this.CD().nav.on(Nav.EVENT_CHANGE_VIEW, this.changeView);
    this.CD().nav.on(Nav.EVENT_CHANGE_SUB_VIEW, this.changeSubView);
    return null;
  };


  /*
  
  	THIS IS A MESS, SORT IT (neil)
   */

  Wrapper.prototype.changeView = function(previous, current) {
    this.previousView = this.getViewByRoute(previous.area);
    this.currentView = this.getViewByRoute(current.area);
    if (!this.previousView) {
      if (this.currentView.type === this.VIEW_TYPE_PAGE) {
        this.transitionViews(false, this.currentView.view);
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.views.home;
        this.transitionViews(false, this.currentView.view, true);
      }
    } else {
      if (this.currentView.type === this.VIEW_TYPE_PAGE && this.previousView.type === this.VIEW_TYPE_PAGE) {
        this.transitionViews(this.previousView.view, this.currentView.view);
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL && this.previousView.type === this.VIEW_TYPE_PAGE) {
        this.backgroundView = this.previousView;
        this.transitionViews(false, this.currentView.view, true);
      } else if (this.currentView.type === this.VIEW_TYPE_PAGE && this.previousView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.backgroundView || this.views.home;
        if (this.backgroundView !== this.currentView) {
          this.transitionViews(this.previousView.view, this.currentView.view, false, true);
        } else if (this.backgroundView === this.currentView) {
          this.transitionViews(this.previousView.view, false);
        }
      } else if (this.currentView.type === this.VIEW_TYPE_MODAL && this.previousView.type === this.VIEW_TYPE_MODAL) {
        this.backgroundView = this.backgroundView || this.views.home;
        this.transitionViews(this.previousView.view, this.currentView.view, true);
      }
    }
    return null;
  };

  Wrapper.prototype.changeSubView = function(current) {
    this.currentView.view.trigger(Nav.EVENT_CHANGE_SUB_VIEW, current.sub);
    return null;
  };

  Wrapper.prototype.transitionViews = function(from, to, toModal, fromModal) {
    var _ref, _ref1;
    if (toModal == null) {
      toModal = false;
    }
    if (fromModal == null) {
      fromModal = false;
    }
    if (from === to) {
      return;
    }
    if (toModal) {
      if ((_ref = this.backgroundView.view) != null) {
        _ref.show();
      }
    }
    if (fromModal) {
      if ((_ref1 = this.backgroundView.view) != null) {
        _ref1.hide();
      }
    }
    if (from && to) {
      from.hide(to.show);
    } else if (from) {
      from.hide();
    } else if (to) {
      to.show();
    }
    return null;
  };

  return Wrapper;

})(AbstractView);

module.exports = Wrapper;



},{"../../router/Nav":17,"../AbstractView":27,"../aboutPage/AboutPageView":29,"../contributePage/ContributePageView":34,"../doodlePage/DoodlePageView":35,"../home/HomeView":36}],34:[function(require,module,exports){
var AbstractViewPage, ContributePageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

ContributePageView = (function(_super) {
  __extends(ContributePageView, _super);

  ContributePageView.prototype.template = 'page-contribute';

  function ContributePageView() {
    this.templateVars = {
      desc: this.CD().locale.get("contribute_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    ContributePageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  return ContributePageView;

})(AbstractViewPage);

module.exports = ContributePageView;



},{"../AbstractViewPage":28}],35:[function(require,module,exports){
var AbstractViewPage, DoodlePageView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

DoodlePageView = (function(_super) {
  __extends(DoodlePageView, _super);

  DoodlePageView.prototype.template = 'page-doodle';

  DoodlePageView.prototype.model = null;

  function DoodlePageView() {
    this.getDoodle = __bind(this.getDoodle, this);
    this.show = __bind(this.show, this);
    this.templateVars = {
      desc: this.CD().locale.get("doodle_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new exampleClass
     */
    DoodlePageView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  DoodlePageView.prototype.show = function() {
    this.model = this.getDoodle();
    DoodlePageView.__super__.show.apply(this, arguments);
    return null;
  };

  DoodlePageView.prototype.getDoodle = function() {
    var doodle;
    doodle = this.CD().appData.doodles.getDoodleBySlug(this.CD().nav.current.sub + '/' + this.CD().nav.current.ter);
    return doodle;
  };

  return DoodlePageView;

})(AbstractViewPage);

module.exports = DoodlePageView;



},{"../AbstractViewPage":28}],36:[function(require,module,exports){
var AbstractViewPage, HomeView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

HomeView = (function(_super) {
  __extends(HomeView, _super);

  HomeView.prototype.template = 'page-home';

  function HomeView() {
    this.show = __bind(this.show, this);
    this.templateVars = {
      desc: this.CD().locale.get("home_desc")
    };

    /*
    
    		instantiate classes here
    
    		@exampleClass = new ExampleClass
     */
    HomeView.__super__.constructor.call(this);

    /*
    
    		add classes to app structure here
    
    		@
    			.addChild(@exampleClass)
     */
    return null;
  }

  HomeView.prototype.show = function() {
    var doodle, html, _i, _len, _ref;
    HomeView.__super__.show.apply(this, arguments);
    html = "<ul>";
    _ref = this.CD().appData.doodles.models;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      doodle = _ref[_i];
      html += "<li><a href=\"" + (this.CD().BASE_URL) + "/" + (this.CD().nav.sections.DOODLES) + "/" + (doodle.get('slug')) + "\">" + (doodle.get('author.name')) + " - " + (doodle.get('name')) + "</a></li>";
    }
    html += '</ul>';
    this.$el.find('.home-grid').html(html);
    return null;
  };

  return HomeView;

})(AbstractViewPage);

module.exports = HomeView;



},{"../AbstractViewPage":28}],37:[function(require,module,exports){
var AbstractModal, AbstractView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

AbstractModal = (function(_super) {
  __extends(AbstractModal, _super);

  AbstractModal.prototype.$window = null;


  /* override in individual classes */

  AbstractModal.prototype.name = null;

  AbstractModal.prototype.template = null;

  function AbstractModal() {
    this.closeClick = __bind(this.closeClick, this);
    this.animateOut = __bind(this.animateOut, this);
    this.animateIn = __bind(this.animateIn, this);
    this.onKeyUp = __bind(this.onKeyUp, this);
    this.setListeners = __bind(this.setListeners, this);
    this.dispose = __bind(this.dispose, this);
    this.hide = __bind(this.hide, this);
    this.$window = $(window);
    AbstractModal.__super__.constructor.call(this);
    this.CD().appView.addChild(this);
    this.setListeners('on');
    this.animateIn();
    return null;
  }

  AbstractModal.prototype.hide = function() {
    this.animateOut((function(_this) {
      return function() {
        return _this.CD().appView.remove(_this);
      };
    })(this));
    return null;
  };

  AbstractModal.prototype.dispose = function() {
    this.setListeners('off');
    this.CD().appView.modalManager.modals[this.name].view = null;
    return null;
  };

  AbstractModal.prototype.setListeners = function(setting) {
    this.$window[setting]('keyup', this.onKeyUp);
    this.$('[data-close]')[setting]('click', this.closeClick);
    return null;
  };

  AbstractModal.prototype.onKeyUp = function(e) {
    if (e.keyCode === 27) {
      this.hide();
    }
    return null;
  };

  AbstractModal.prototype.animateIn = function() {
    TweenLite.to(this.$el, 0.3, {
      'visibility': 'visible',
      'opacity': 1,
      ease: Quad.easeOut
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      delay: 0.15,
      'transform': 'scale(1)',
      'visibility': 'visible',
      'opacity': 1,
      ease: Back.easeOut
    });
    return null;
  };

  AbstractModal.prototype.animateOut = function(callback) {
    TweenLite.to(this.$el, 0.3, {
      delay: 0.15,
      'opacity': 0,
      ease: Quad.easeOut,
      onComplete: callback
    });
    TweenLite.to(this.$el.find('.inner'), 0.3, {
      'transform': 'scale(0.8)',
      'opacity': 0,
      ease: Back.easeIn
    });
    return null;
  };

  AbstractModal.prototype.closeClick = function(e) {
    e.preventDefault();
    this.hide();
    return null;
  };

  return AbstractModal;

})(AbstractView);

module.exports = AbstractModal;



},{"../AbstractView":27}],38:[function(require,module,exports){
var AbstractModal, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractModal = require('./AbstractModal');

OrientationModal = (function(_super) {
  __extends(OrientationModal, _super);

  OrientationModal.prototype.name = 'orientationModal';

  OrientationModal.prototype.template = 'orientation-modal';

  OrientationModal.prototype.cb = null;

  function OrientationModal(cb) {
    this.cb = cb;
    this.onUpdateDims = __bind(this.onUpdateDims, this);
    this.setListeners = __bind(this.setListeners, this);
    this.hide = __bind(this.hide, this);
    this.init = __bind(this.init, this);
    this.templateVars = {
      name: this.name
    };
    OrientationModal.__super__.constructor.call(this);
    return null;
  }

  OrientationModal.prototype.init = function() {
    return null;
  };

  OrientationModal.prototype.hide = function(stillLandscape) {
    if (stillLandscape == null) {
      stillLandscape = true;
    }
    this.animateOut((function(_this) {
      return function() {
        _this.CD().appView.remove(_this);
        if (!stillLandscape) {
          return typeof _this.cb === "function" ? _this.cb() : void 0;
        }
      };
    })(this));
    return null;
  };

  OrientationModal.prototype.setListeners = function(setting) {
    OrientationModal.__super__.setListeners.apply(this, arguments);
    this.CD().appView[setting]('updateDims', this.onUpdateDims);
    this.$el[setting]('touchend click', this.hide);
    return null;
  };

  OrientationModal.prototype.onUpdateDims = function(dims) {
    if (dims.o === 'portrait') {
      this.hide(false);
    }
    return null;
  };

  return OrientationModal;

})(AbstractModal);

module.exports = OrientationModal;



},{"./AbstractModal":37}],39:[function(require,module,exports){
var AbstractView, ModalManager, OrientationModal,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

OrientationModal = require('./OrientationModal');

ModalManager = (function(_super) {
  __extends(ModalManager, _super);

  ModalManager.prototype.modals = {
    orientationModal: {
      classRef: OrientationModal,
      view: null
    }
  };

  function ModalManager() {
    this.showModal = __bind(this.showModal, this);
    this.hideOpenModal = __bind(this.hideOpenModal, this);
    this.isOpen = __bind(this.isOpen, this);
    this.init = __bind(this.init, this);
    ModalManager.__super__.constructor.call(this);
    return null;
  }

  ModalManager.prototype.init = function() {
    return null;
  };

  ModalManager.prototype.isOpen = function() {
    var modal, name, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        return true;
      }
    }
    return false;
  };

  ModalManager.prototype.hideOpenModal = function() {
    var modal, name, openModal, _ref;
    _ref = this.modals;
    for (name in _ref) {
      modal = _ref[name];
      if (this.modals[name].view) {
        openModal = this.modals[name].view;
      }
    }
    if (openModal != null) {
      openModal.hide();
    }
    return null;
  };

  ModalManager.prototype.showModal = function(name, cb) {
    if (cb == null) {
      cb = null;
    }
    if (this.modals[name].view) {
      return;
    }
    this.modals[name].view = new this.modals[name].classRef(cb);
    return null;
  };

  return ModalManager;

})(AbstractView);

module.exports = ModalManager;



},{"../AbstractView":27,"./OrientationModal":38}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvQXBwLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBEYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9BYnN0cmFjdENvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9BUEkuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQWJzdHJhY3REYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0xvY2FsZS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9UZW1wbGF0ZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9BYnN0cmFjdE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9kb29kbGUvRG9vZGxlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9OYXYuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0FuYWx5dGljcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQXV0aE1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9GYWNlYm9vay5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvR29vZ2xlUGx1cy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvTWVkaWFRdWVyaWVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9SZXF1ZXN0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1NoYXJlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9BYnN0cmFjdFZpZXdQYWdlLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Fib3V0UGFnZS9BYm91dFBhZ2VWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvRm9vdGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvSGVhZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvUHJlbG9hZGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2Jhc2UvV3JhcHBlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9jb250cmlidXRlUGFnZS9Db250cmlidXRlUGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvZG9vZGxlUGFnZS9Eb29kbGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJ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QSxDQTNCWixDQUFBOztzQkFBQTs7R0FIMEIsYUFIM0IsQ0FBQTs7QUFBQSxNQXlDTSxDQUFDLE9BQVAsR0FBaUIsWUF6Q2pCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwID0gcmVxdWlyZSAnLi9BcHAnXG5cbiMgUFJPRFVDVElPTiBFTlZJUk9OTUVOVCAtIG1heSB3YW50IHRvIHVzZSBzZXJ2ZXItc2V0IHZhcmlhYmxlcyBoZXJlXG4jIElTX0xJVkUgPSBkbyAtPiByZXR1cm4gaWYgd2luZG93LmxvY2F0aW9uLmhvc3QuaW5kZXhPZignbG9jYWxob3N0JykgPiAtMSBvciB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGlzICc/ZCcgdGhlbiBmYWxzZSBlbHNlIHRydWVcblxuIyMjXG5cbldJUCAtIHRoaXMgd2lsbCBpZGVhbGx5IGNoYW5nZSB0byBvbGQgZm9ybWF0IChhYm92ZSkgd2hlbiBjYW4gZmlndXJlIGl0IG91dFxuXG4jIyNcblxuSVNfTElWRSA9IGZhbHNlXG5cbiMgT05MWSBFWFBPU0UgQVBQIEdMT0JBTExZIElGIExPQ0FMIE9SIERFVidJTkdcbnZpZXcgPSBpZiBJU19MSVZFIHRoZW4ge30gZWxzZSAod2luZG93IG9yIGRvY3VtZW50KVxuXG4jIERFQ0xBUkUgTUFJTiBBUFBMSUNBVElPTlxudmlldy5DRCA9IG5ldyBBcHAgSVNfTElWRVxudmlldy5DRC5pbml0KClcbiIsIkFuYWx5dGljcyAgICA9IHJlcXVpcmUgJy4vdXRpbHMvQW5hbHl0aWNzJ1xuQXV0aE1hbmFnZXIgID0gcmVxdWlyZSAnLi91dGlscy9BdXRoTWFuYWdlcidcblNoYXJlICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvU2hhcmUnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi91dGlscy9Hb29nbGVQbHVzJ1xuVGVtcGxhdGVzICAgID0gcmVxdWlyZSAnLi9kYXRhL1RlbXBsYXRlcydcbkxvY2FsZSAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9Mb2NhbGUnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9Sb3V0ZXInXG5OYXYgICAgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9OYXYnXG5BcHBEYXRhICAgICAgPSByZXF1aXJlICcuL0FwcERhdGEnXG5BcHBWaWV3ICAgICAgPSByZXF1aXJlICcuL0FwcFZpZXcnXG5NZWRpYVF1ZXJpZXMgPSByZXF1aXJlICcuL3V0aWxzL01lZGlhUXVlcmllcydcblxuY2xhc3MgQXBwXG5cbiAgICBMSVZFICAgICAgIDogbnVsbFxuICAgIEJBU0VfVVJMICAgOiB3aW5kb3cuY29uZmlnLmhvc3RuYW1lXG4gICAgbG9jYWxlQ29kZSA6IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuICAgIG9ialJlYWR5ICAgOiAwXG5cbiAgICBfdG9DbGVhbiAgIDogWydvYmpSZWFkeScsICdzZXRGbGFncycsICdvYmplY3RDb21wbGV0ZScsICdpbml0JywgJ2luaXRPYmplY3RzJywgJ2luaXRTREtzJywgJ2luaXRBcHAnLCAnZ28nLCAnY2xlYW51cCcsICdfdG9DbGVhbiddXG5cbiAgICBjb25zdHJ1Y3RvciA6IChATElWRSkgLT5cblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgc2V0RmxhZ3MgOiA9PlxuXG4gICAgICAgIHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5zZXR1cCgpO1xuXG4gICAgICAgIEBJU19BTkRST0lEICAgID0gdWEuaW5kZXhPZignYW5kcm9pZCcpID4gLTFcbiAgICAgICAgQElTX0ZJUkVGT1ggICAgPSB1YS5pbmRleE9mKCdmaXJlZm94JykgPiAtMVxuICAgICAgICBASVNfQ0hST01FX0lPUyA9IGlmIHVhLm1hdGNoKCdjcmlvcycpIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlICMgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTM4MDgwNTNcblxuICAgICAgICBudWxsXG5cbiAgICBvYmplY3RDb21wbGV0ZSA6ID0+XG5cbiAgICAgICAgQG9ialJlYWR5KytcbiAgICAgICAgQGluaXRBcHAoKSBpZiBAb2JqUmVhZHkgPj0gNFxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEBpbml0T2JqZWN0cygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdE9iamVjdHMgOiA9PlxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzIFwiL2RhdGEvdGVtcGxhdGVzI3soaWYgQExJVkUgdGhlbiAnLm1pbicgZWxzZSAnJyl9LnhtbFwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGxvY2FsZSAgICA9IG5ldyBMb2NhbGUgXCIvZGF0YS9sb2NhbGVzL3N0cmluZ3MuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFuYWx5dGljcyA9IG5ldyBBbmFseXRpY3MgXCIvZGF0YS90cmFja2luZy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYXBwRGF0YSAgID0gbmV3IEFwcERhdGEgQG9iamVjdENvbXBsZXRlXG5cbiAgICAgICAgIyBpZiBuZXcgb2JqZWN0cyBhcmUgYWRkZWQgZG9uJ3QgZm9yZ2V0IHRvIGNoYW5nZSB0aGUgYEBvYmplY3RDb21wbGV0ZWAgZnVuY3Rpb25cblxuICAgICAgICBudWxsXG5cbiAgICBpbml0U0RLcyA6ID0+XG5cbiAgICAgICAgRmFjZWJvb2subG9hZCgpXG4gICAgICAgIEdvb2dsZVBsdXMubG9hZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdEFwcCA6ID0+XG5cbiAgICAgICAgQHNldEZsYWdzKClcblxuICAgICAgICAjIyMgU3RhcnRzIGFwcGxpY2F0aW9uICMjI1xuICAgICAgICBAYXBwVmlldyA9IG5ldyBBcHBWaWV3XG4gICAgICAgIEByb3V0ZXIgID0gbmV3IFJvdXRlclxuICAgICAgICBAbmF2ICAgICA9IG5ldyBOYXZcbiAgICAgICAgQGF1dGggICAgPSBuZXcgQXV0aE1hbmFnZXJcbiAgICAgICAgQHNoYXJlICAgPSBuZXcgU2hhcmVcblxuICAgICAgICBAZ28oKVxuXG4gICAgICAgIEBpbml0U0RLcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ28gOiA9PlxuXG4gICAgICAgICMjIyBBZnRlciBldmVyeXRoaW5nIGlzIGxvYWRlZCwga2lja3Mgb2ZmIHdlYnNpdGUgIyMjXG4gICAgICAgIEBhcHBWaWV3LnJlbmRlcigpXG5cbiAgICAgICAgIyMjIHJlbW92ZSByZWR1bmRhbnQgaW5pdGlhbGlzYXRpb24gbWV0aG9kcyAvIHByb3BlcnRpZXMgIyMjXG4gICAgICAgIEBjbGVhbnVwKClcblxuICAgICAgICBudWxsXG5cbiAgICBjbGVhbnVwIDogPT5cblxuICAgICAgICBmb3IgZm4gaW4gQF90b0NsZWFuXG4gICAgICAgICAgICBAW2ZuXSA9IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBAW2ZuXVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkFic3RyYWN0RGF0YSAgICAgID0gcmVxdWlyZSAnLi9kYXRhL0Fic3RyYWN0RGF0YSdcblJlcXVlc3RlciAgICAgICAgID0gcmVxdWlyZSAnLi91dGlscy9SZXF1ZXN0ZXInXG5BUEkgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BUEknXG5Eb29kbGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4vY29sbGVjdGlvbnMvZG9vZGxlcy9Eb29kbGVzQ29sbGVjdGlvbidcblxuY2xhc3MgQXBwRGF0YSBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG4gICAgY2FsbGJhY2sgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IChAY2FsbGJhY2spIC0+XG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYWRkIGFsbCBkYXRhIGNsYXNzZXMgaGVyZVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIHN1cGVyKClcblxuICAgICAgICBAZG9vZGxlcyA9IG5ldyBEb29kbGVzQ29sbGVjdGlvblxuXG4gICAgICAgIEBnZXRTdGFydERhdGEoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICAjIyNcbiAgICBnZXQgYXBwIGJvb3RzdHJhcCBkYXRhIC0gZW1iZWQgaW4gSFRNTCBvciBBUEkgZW5kcG9pbnRcbiAgICAjIyNcbiAgICBnZXRTdGFydERhdGEgOiA9PlxuICAgICAgICBcbiAgICAgICAgIyBpZiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgIGlmIHRydWVcblxuICAgICAgICAgICAgciA9IFJlcXVlc3Rlci5yZXF1ZXN0XG4gICAgICAgICAgICAgICAgIyB1cmwgIDogQVBJLmdldCgnc3RhcnQnKVxuICAgICAgICAgICAgICAgIHVybCAgOiBAQ0QoKS5CQVNFX1VSTCArICcvZGF0YS9fRFVNTVkvZG9vZGxlcy5qc29uJ1xuICAgICAgICAgICAgICAgIHR5cGUgOiAnR0VUJ1xuXG4gICAgICAgICAgICByLmRvbmUgQG9uU3RhcnREYXRhUmVjZWl2ZWRcbiAgICAgICAgICAgIHIuZmFpbCA9PlxuXG4gICAgICAgICAgICAgICAgIyBjb25zb2xlLmVycm9yIFwiZXJyb3IgbG9hZGluZyBhcGkgc3RhcnQgZGF0YVwiXG5cbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICB0aGlzIGlzIG9ubHkgdGVtcG9yYXJ5LCB3aGlsZSB0aGVyZSBpcyBubyBib290c3RyYXAgZGF0YSBoZXJlLCBub3JtYWxseSB3b3VsZCBoYW5kbGUgZXJyb3IgLyBmYWlsXG4gICAgICAgICAgICAgICAgIyMjXG4gICAgICAgICAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICBvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgY29uc29sZS5sb2cgXCJvblN0YXJ0RGF0YVJlY2VpdmVkIDogKGRhdGEpID0+XCIsIGRhdGFcblxuICAgICAgICBAZG9vZGxlcy5hZGQgZGF0YS5kb29kbGVzXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgYm9vdHN0cmFwIGRhdGEgcmVjZWl2ZWQsIGFwcCByZWFkeSB0byBnb1xuXG4gICAgICAgICMjI1xuXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBEYXRhXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL3ZpZXcvQWJzdHJhY3RWaWV3J1xuUHJlbG9hZGVyICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvUHJlbG9hZGVyJ1xuSGVhZGVyICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvSGVhZGVyJ1xuV3JhcHBlciAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvV3JhcHBlcidcbkZvb3RlciAgICAgICA9IHJlcXVpcmUgJy4vdmlldy9iYXNlL0Zvb3Rlcidcbk1vZGFsTWFuYWdlciA9IHJlcXVpcmUgJy4vdmlldy9tb2RhbHMvX01vZGFsTWFuYWdlcidcblxuY2xhc3MgQXBwVmlldyBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnbWFpbidcblxuICAgICR3aW5kb3cgIDogbnVsbFxuICAgICRib2R5ICAgIDogbnVsbFxuXG4gICAgd3JhcHBlciAgOiBudWxsXG4gICAgZm9vdGVyICAgOiBudWxsXG5cbiAgICBkaW1zIDpcbiAgICAgICAgdyA6IG51bGxcbiAgICAgICAgaCA6IG51bGxcbiAgICAgICAgbyA6IG51bGxcbiAgICAgICAgYyA6IG51bGxcblxuICAgIGV2ZW50cyA6XG4gICAgICAgICdjbGljayBhJyA6ICdsaW5rTWFuYWdlcidcblxuICAgIEVWRU5UX1VQREFURV9ESU1FTlNJT05TIDogJ0VWRU5UX1VQREFURV9ESU1FTlNJT05TJ1xuXG4gICAgTU9CSUxFX1dJRFRIIDogNzAwXG4gICAgTU9CSUxFICAgICAgIDogJ21vYmlsZSdcbiAgICBOT05fTU9CSUxFICAgOiAnbm9uX21vYmlsZSdcblxuICAgIGNvbnN0cnVjdG9yIDogLT5cblxuICAgICAgICBAJHdpbmRvdyA9ICQod2luZG93KVxuICAgICAgICBAJGJvZHkgICA9ICQoJ2JvZHknKS5lcSgwKVxuXG4gICAgICAgIHN1cGVyKClcblxuICAgIGRpc2FibGVUb3VjaDogPT5cblxuICAgICAgICBAJHdpbmRvdy5vbiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG4gICAgICAgIHJldHVyblxuXG4gICAgZW5hYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub2ZmICd0b3VjaG1vdmUnLCBAb25Ub3VjaE1vdmVcbiAgICAgICAgcmV0dXJuXG5cbiAgICBvblRvdWNoTW92ZTogKCBlICkgLT5cblxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgcmV0dXJuXG5cbiAgICByZW5kZXIgOiA9PlxuXG4gICAgICAgIEBiaW5kRXZlbnRzKClcblxuICAgICAgICBAcHJlbG9hZGVyICAgID0gbmV3IFByZWxvYWRlclxuXG4gICAgICAgIEBtb2RhbE1hbmFnZXIgPSBuZXcgTW9kYWxNYW5hZ2VyXG5cbiAgICAgICAgQGhlYWRlciAgPSBuZXcgSGVhZGVyXG4gICAgICAgIEB3cmFwcGVyID0gbmV3IFdyYXBwZXJcbiAgICAgICAgQGZvb3RlciAgPSBuZXcgRm9vdGVyXG5cbiAgICAgICAgQFxuICAgICAgICAgICAgLmFkZENoaWxkIEBoZWFkZXJcbiAgICAgICAgICAgIC5hZGRDaGlsZCBAd3JhcHBlclxuICAgICAgICAgICAgLmFkZENoaWxkIEBmb290ZXJcblxuICAgICAgICBAcHJlbG9hZGVyLnNob3cgPT4gQGhlYWRlci5hbmltYXRlVGV4dEluKClcblxuICAgICAgICBAb25BbGxSZW5kZXJlZCgpXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBiaW5kRXZlbnRzIDogPT5cblxuICAgICAgICBAb24gJ2FsbFJlbmRlcmVkJywgQG9uQWxsUmVuZGVyZWRcblxuICAgICAgICBAb25SZXNpemUoKVxuXG4gICAgICAgIEBvblJlc2l6ZSA9IF8uZGVib3VuY2UgQG9uUmVzaXplLCAzMDBcbiAgICAgICAgQCR3aW5kb3cub24gJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIEBvblJlc2l6ZVxuICAgICAgICByZXR1cm5cblxuICAgIG9uQWxsUmVuZGVyZWQgOiA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJvbkFsbFJlbmRlcmVkIDogPT5cIlxuXG4gICAgICAgIEAkYm9keS5wcmVwZW5kIEAkZWxcblxuICAgICAgICBAYmVnaW4oKVxuICAgICAgICByZXR1cm5cblxuICAgIGJlZ2luIDogPT5cblxuICAgICAgICBAdHJpZ2dlciAnc3RhcnQnXG5cbiAgICAgICAgQENEKCkucm91dGVyLnN0YXJ0KClcblxuICAgICAgICAjIEBwcmVsb2FkZXIuaGlkZSgpXG4gICAgICAgIHJldHVyblxuXG4gICAgb25SZXNpemUgOiA9PlxuXG4gICAgICAgIEBnZXREaW1zKClcbiAgICAgICAgcmV0dXJuXG5cbiAgICBnZXREaW1zIDogPT5cblxuICAgICAgICB3ID0gd2luZG93LmlubmVyV2lkdGggb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIG9yIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgICAgICAgaCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIGMgOiBpZiB3IDw9IEBNT0JJTEVfV0lEVEggdGhlbiBATU9CSUxFIGVsc2UgQE5PTl9NT0JJTEVcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBsaW5rTWFuYWdlciA6IChlKSA9PlxuXG4gICAgICAgIGhyZWYgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBocmVmXG5cbiAgICAgICAgQG5hdmlnYXRlVG9VcmwgaHJlZiwgZVxuXG4gICAgICAgIHJldHVyblxuXG4gICAgbmF2aWdhdGVUb1VybCA6ICggaHJlZiwgZSA9IG51bGwgKSA9PlxuXG4gICAgICAgIHJvdXRlICAgPSBpZiBocmVmLm1hdGNoKEBDRCgpLkJBU0VfVVJMKSB0aGVuIGhyZWYuc3BsaXQoQENEKCkuQkFTRV9VUkwpWzFdIGVsc2UgaHJlZlxuICAgICAgICBzZWN0aW9uID0gaWYgcm91dGUuY2hhckF0KDApIGlzICcvJyB0aGVuIHJvdXRlLnNwbGl0KCcvJylbMV0uc3BsaXQoJy8nKVswXSBlbHNlIHJvdXRlLnNwbGl0KCcvJylbMF1cblxuICAgICAgICBpZiBAQ0QoKS5uYXYuZ2V0U2VjdGlvbiBzZWN0aW9uXG4gICAgICAgICAgICBlPy5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICBAQ0QoKS5yb3V0ZXIubmF2aWdhdGVUbyByb3V0ZVxuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgQGhhbmRsZUV4dGVybmFsTGluayBocmVmXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBoYW5kbGVFeHRlcm5hbExpbmsgOiAoZGF0YSkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcImhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcIlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGJpbmQgdHJhY2tpbmcgZXZlbnRzIGlmIG5lY2Vzc2FyeVxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIHJldHVyblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFZpZXdcbiIsImNsYXNzIEFic3RyYWN0Q29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RDb2xsZWN0aW9uXG4iLCJUZW1wbGF0ZU1vZGVsID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblxuY2xhc3MgVGVtcGxhdGVzQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRtb2RlbCA6IFRlbXBsYXRlTW9kZWxcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZXNDb2xsZWN0aW9uXG4iLCJBYnN0cmFjdENvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9BYnN0cmFjdENvbGxlY3Rpb24nXG5Eb29kbGVNb2RlbCAgICAgICAgPSByZXF1aXJlICcuLi8uLi9tb2RlbHMvZG9vZGxlL0Rvb2RsZU1vZGVsJ1xuXG5jbGFzcyBEb29kbGVzQ29sbGVjdGlvbiBleHRlbmRzIEFic3RyYWN0Q29sbGVjdGlvblxuXG5cdG1vZGVsIDogRG9vZGxlTW9kZWxcblxuXHRnZXREb29kbGVCeVNsdWcgOiAoc2x1ZykgPT5cblxuXHRcdGRvb2RsZSA9IEBmaW5kV2hlcmUgc2x1ZyA6IHNsdWdcblxuXHRcdGlmICFkb29kbGVcblx0XHRcdHRocm93IG5ldyBFcnJvciBcInkgdSBubyBkb29kbGU/XCJcblxuXHRcdHJldHVybiBkb29kbGVcblxubW9kdWxlLmV4cG9ydHMgPSBEb29kbGVzQ29sbGVjdGlvblxuIiwiQVBJUm91dGVNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL0FQSVJvdXRlTW9kZWwnXG5cbmNsYXNzIEFQSVxuXG5cdEBtb2RlbCA6IG5ldyBBUElSb3V0ZU1vZGVsXG5cblx0QGdldENvbnRhbnRzIDogPT5cblxuXHRcdCMjIyBhZGQgbW9yZSBpZiB3ZSB3YW5uYSB1c2UgaW4gQVBJIHN0cmluZ3MgIyMjXG5cdFx0QkFTRV9VUkwgOiBAQ0QoKS5CQVNFX1VSTFxuXG5cdEBnZXQgOiAobmFtZSwgdmFycykgPT5cblxuXHRcdHZhcnMgPSAkLmV4dGVuZCB0cnVlLCB2YXJzLCBAZ2V0Q29udGFudHMoKVxuXHRcdHJldHVybiBAc3VwcGxhbnRTdHJpbmcgQG1vZGVsLmdldChuYW1lKSwgdmFyc1xuXG5cdEBzdXBwbGFudFN0cmluZyA6IChzdHIsIHZhbHMpIC0+XG5cblx0XHRyZXR1cm4gc3RyLnJlcGxhY2UgL3t7IChbXnt9XSopIH19L2csIChhLCBiKSAtPlxuXHRcdFx0ciA9IHZhbHNbYl0gb3IgaWYgdHlwZW9mIHZhbHNbYl0gaXMgJ251bWJlcicgdGhlbiB2YWxzW2JdLnRvU3RyaW5nKCkgZWxzZSAnJ1xuXHRcdChpZiB0eXBlb2YgciBpcyBcInN0cmluZ1wiIG9yIHR5cGVvZiByIGlzIFwibnVtYmVyXCIgdGhlbiByIGVsc2UgYSlcblxuXHRAQ0QgOiA9PlxuXG5cdFx0cmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVxuIiwiY2xhc3MgQWJzdHJhY3REYXRhXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0Xy5leHRlbmQgQCwgQmFja2JvbmUuRXZlbnRzXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdERhdGFcbiIsIkxvY2FsZXNNb2RlbCA9IHJlcXVpcmUgJy4uL21vZGVscy9jb3JlL0xvY2FsZXNNb2RlbCdcbkFQSSAgICAgICAgICA9IHJlcXVpcmUgJy4uL2RhdGEvQVBJJ1xuXG4jIyNcbiMgTG9jYWxlIExvYWRlciAjXG5cbkZpcmVzIGJhY2sgYW4gZXZlbnQgd2hlbiBjb21wbGV0ZVxuXG4jIyNcbmNsYXNzIExvY2FsZVxuXG4gICAgbGFuZyAgICAgOiBudWxsXG4gICAgZGF0YSAgICAgOiBudWxsXG4gICAgY2FsbGJhY2sgOiBudWxsXG4gICAgYmFja3VwICAgOiBudWxsXG4gICAgZGVmYXVsdCAgOiAnZW4tZ2InXG5cbiAgICBjb25zdHJ1Y3RvciA6IChkYXRhLCBjYikgLT5cblxuICAgICAgICAjIyMgc3RhcnQgTG9jYWxlIExvYWRlciwgZGVmaW5lIGxvY2FsZSBiYXNlZCBvbiBicm93c2VyIGxhbmd1YWdlICMjI1xuXG4gICAgICAgIEBjYWxsYmFjayA9IGNiXG4gICAgICAgIEBiYWNrdXAgPSBkYXRhXG5cbiAgICAgICAgQGxhbmcgPSBAZ2V0TGFuZygpXG5cbiAgICAgICAgaWYgQVBJLmdldCgnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSlcblxuICAgICAgICAgICAgJC5hamF4XG4gICAgICAgICAgICAgICAgdXJsICAgICA6IEFQSS5nZXQoICdsb2NhbGUnLCB7IGNvZGUgOiBAbGFuZyB9IClcbiAgICAgICAgICAgICAgICB0eXBlICAgIDogJ0dFVCdcbiAgICAgICAgICAgICAgICBzdWNjZXNzIDogQG9uU3VjY2Vzc1xuICAgICAgICAgICAgICAgIGVycm9yICAgOiBAbG9hZEJhY2t1cFxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQGxvYWRCYWNrdXAoKVxuXG4gICAgICAgIG51bGxcbiAgICAgICAgICAgIFxuICAgIGdldExhbmcgOiA9PlxuXG4gICAgICAgIGlmIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2ggYW5kIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gubWF0Y2goJ2xhbmc9JylcblxuICAgICAgICAgICAgbGFuZyA9IHdpbmRvdy5sb2NhdGlvbi5zZWFyY2guc3BsaXQoJ2xhbmc9JylbMV0uc3BsaXQoJyYnKVswXVxuXG4gICAgICAgIGVsc2UgaWYgd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cuY29uZmlnLmxvY2FsZUNvZGVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIGxhbmcgPSBAZGVmYXVsdFxuXG4gICAgICAgIGxhbmdcblxuICAgIG9uU3VjY2VzcyA6IChldmVudCkgPT5cblxuICAgICAgICAjIyMgRmlyZXMgYmFjayBhbiBldmVudCBvbmNlIGl0J3MgY29tcGxldGUgIyMjXG5cbiAgICAgICAgZCA9IG51bGxcblxuICAgICAgICBpZiBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgICAgIGQgPSBKU09OLnBhcnNlIGV2ZW50LnJlc3BvbnNlVGV4dFxuICAgICAgICBlbHNlIFxuICAgICAgICAgICAgZCA9IGV2ZW50XG5cbiAgICAgICAgQGRhdGEgPSBuZXcgTG9jYWxlc01vZGVsIGRcbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbG9hZEJhY2t1cCA6ID0+XG5cbiAgICAgICAgIyMjIFdoZW4gQVBJIG5vdCBhdmFpbGFibGUsIHRyaWVzIHRvIGxvYWQgdGhlIHN0YXRpYyAudHh0IGxvY2FsZSAjIyNcblxuICAgICAgICAkLmFqYXggXG4gICAgICAgICAgICB1cmwgICAgICA6IEBiYWNrdXBcbiAgICAgICAgICAgIGRhdGFUeXBlIDogJ2pzb24nXG4gICAgICAgICAgICBjb21wbGV0ZSA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgIGVycm9yICAgIDogPT4gY29uc29sZS5sb2cgJ2Vycm9yIG9uIGxvYWRpbmcgYmFja3VwJ1xuXG4gICAgICAgIG51bGxcblxuICAgIGdldCA6IChpZCkgPT5cblxuICAgICAgICAjIyMgZ2V0IFN0cmluZyBmcm9tIGxvY2FsZVxuICAgICAgICArIGlkIDogc3RyaW5nIGlkIG9mIHRoZSBMb2NhbGlzZWQgU3RyaW5nXG4gICAgICAgICMjI1xuXG4gICAgICAgIHJldHVybiBAZGF0YS5nZXRTdHJpbmcgaWRcblxuICAgIGdldExvY2FsZUltYWdlIDogKHVybCkgPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LmNvbmZpZy5DRE4gKyBcIi9pbWFnZXMvbG9jYWxlL1wiICsgd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlICsgXCIvXCIgKyB1cmxcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVcbiIsIlRlbXBsYXRlTW9kZWwgICAgICAgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9UZW1wbGF0ZU1vZGVsJ1xuVGVtcGxhdGVzQ29sbGVjdGlvbiA9IHJlcXVpcmUgJy4uL2NvbGxlY3Rpb25zL2NvcmUvVGVtcGxhdGVzQ29sbGVjdGlvbidcblxuY2xhc3MgVGVtcGxhdGVzXG5cbiAgICB0ZW1wbGF0ZXMgOiBudWxsXG4gICAgY2IgICAgICAgIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAodGVtcGxhdGVzLCBjYWxsYmFjaykgLT5cblxuICAgICAgICBAY2IgPSBjYWxsYmFja1xuXG4gICAgICAgICQuYWpheCB1cmwgOiB0ZW1wbGF0ZXMsIHN1Y2Nlc3MgOiBAcGFyc2VYTUxcbiAgICAgICAgICAgXG4gICAgICAgIG51bGxcblxuICAgIHBhcnNlWE1MIDogKGRhdGEpID0+XG5cbiAgICAgICAgdGVtcCA9IFtdXG5cbiAgICAgICAgJChkYXRhKS5maW5kKCd0ZW1wbGF0ZScpLmVhY2ggKGtleSwgdmFsdWUpIC0+XG4gICAgICAgICAgICAkdmFsdWUgPSAkKHZhbHVlKVxuICAgICAgICAgICAgdGVtcC5wdXNoIG5ldyBUZW1wbGF0ZU1vZGVsXG4gICAgICAgICAgICAgICAgaWQgICA6ICR2YWx1ZS5hdHRyKCdpZCcpLnRvU3RyaW5nKClcbiAgICAgICAgICAgICAgICB0ZXh0IDogJC50cmltICR2YWx1ZS50ZXh0KClcblxuICAgICAgICBAdGVtcGxhdGVzID0gbmV3IFRlbXBsYXRlc0NvbGxlY3Rpb24gdGVtcFxuXG4gICAgICAgIEBjYj8oKVxuICAgICAgICBcbiAgICAgICAgbnVsbCAgICAgICAgXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgdCA9IEB0ZW1wbGF0ZXMud2hlcmUgaWQgOiBpZFxuICAgICAgICB0ID0gdFswXS5nZXQgJ3RleHQnXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gJC50cmltIHRcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZXNcbiIsImNsYXNzIEFic3RyYWN0TW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5EZWVwTW9kZWxcblxuXHRjb25zdHJ1Y3RvciA6IChhdHRycywgb3B0aW9uKSAtPlxuXG5cdFx0YXR0cnMgPSBAX2ZpbHRlckF0dHJzIGF0dHJzXG5cblx0XHRyZXR1cm4gQmFja2JvbmUuRGVlcE1vZGVsLmFwcGx5IEAsIGFyZ3VtZW50c1xuXG5cdHNldCA6IChhdHRycywgb3B0aW9ucykgLT5cblxuXHRcdG9wdGlvbnMgb3IgKG9wdGlvbnMgPSB7fSlcblxuXHRcdGF0dHJzID0gQF9maWx0ZXJBdHRycyBhdHRyc1xuXG5cdFx0b3B0aW9ucy5kYXRhID0gSlNPTi5zdHJpbmdpZnkgYXR0cnNcblxuXHRcdHJldHVybiBCYWNrYm9uZS5EZWVwTW9kZWwucHJvdG90eXBlLnNldC5jYWxsIEAsIGF0dHJzLCBvcHRpb25zXG5cblx0X2ZpbHRlckF0dHJzIDogKGF0dHJzKSA9PlxuXG5cdFx0YXR0cnNcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RNb2RlbFxuIiwiY2xhc3MgQVBJUm91dGVNb2RlbCBleHRlbmRzIEJhY2tib25lLkRlZXBNb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuXG4gICAgICAgIHN0YXJ0ICAgICAgICAgOiBcIlwiICMgRWc6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3N0YXJ0XCJcblxuICAgICAgICBsb2NhbGUgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfVVJMIH19L2FwaS9sMTBuL3t7IGNvZGUgfX1cIlxuXG4gICAgICAgIHVzZXIgICAgICAgICAgOlxuICAgICAgICAgICAgbG9naW4gICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvbG9naW5cIlxuICAgICAgICAgICAgcmVnaXN0ZXIgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgcGFzc3dvcmQgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvcGFzc3dvcmRcIlxuICAgICAgICAgICAgdXBkYXRlICAgICA6IFwie3sgQkFTRV9VUkwgfX0vYXBpL3VzZXIvdXBkYXRlXCJcbiAgICAgICAgICAgIGxvZ291dCAgICAgOiBcInt7IEJBU0VfVVJMIH19L2FwaS91c2VyL2xvZ291dFwiXG4gICAgICAgICAgICByZW1vdmUgICAgIDogXCJ7eyBCQVNFX1VSTCB9fS9hcGkvdXNlci9yZW1vdmVcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IEFQSVJvdXRlTW9kZWxcbiIsImNsYXNzIExvY2FsZXNNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG4gICAgICAgIGNvZGUgICAgIDogbnVsbFxuICAgICAgICBsYW5ndWFnZSA6IG51bGxcbiAgICAgICAgc3RyaW5ncyAgOiBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRfbGFuZ3VhZ2UgOiA9PlxuICAgICAgICByZXR1cm4gQGdldCgnbGFuZ3VhZ2UnKVxuXG4gICAgZ2V0U3RyaW5nIDogKGlkKSA9PlxuICAgICAgICAoKHJldHVybiBlIGlmKGEgaXMgaWQpKSBmb3IgYSwgZSBvZiB2WydzdHJpbmdzJ10pIGZvciBrLCB2IG9mIEBnZXQoJ3N0cmluZ3MnKVxuICAgICAgICBjb25zb2xlLndhcm4gXCJMb2NhbGVzIC0+IG5vdCBmb3VuZCBzdHJpbmc6ICN7aWR9XCJcbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsZXNNb2RlbFxuIiwiY2xhc3MgVGVtcGxhdGVNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cblx0ZGVmYXVsdHMgOiBcblxuXHRcdGlkICAgOiBcIlwiXG5cdFx0dGV4dCA6IFwiXCJcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZU1vZGVsXG4iLCJBYnN0cmFjdE1vZGVsID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RNb2RlbCdcblxuY2xhc3MgRG9vZGxlTW9kZWwgZXh0ZW5kcyBBYnN0cmFjdE1vZGVsXG5cblx0ZGVmYXVsdHMgOiB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZU1vZGVsXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi92aWV3L0Fic3RyYWN0VmlldydcblJvdXRlciAgICAgICA9IHJlcXVpcmUgJy4vUm91dGVyJ1xuXG5jbGFzcyBOYXYgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIEBFVkVOVF9DSEFOR0VfVklFVyAgICAgOiAnRVZFTlRfQ0hBTkdFX1ZJRVcnXG4gICAgQEVWRU5UX0NIQU5HRV9TVUJfVklFVyA6ICdFVkVOVF9DSEFOR0VfU1VCX1ZJRVcnXG5cbiAgICBzZWN0aW9ucyA6IG51bGwgIyBzZXQgdmlhIHdpbmRvdy5jb25maWcgZGF0YSwgc28gY2FuIGJlIGNvbnNpc3RlbnQgd2l0aCBiYWNrZW5kXG5cbiAgICBjdXJyZW50ICA6IGFyZWEgOiBudWxsLCBzdWIgOiBudWxsLCB0ZXIgOiBudWxsXG4gICAgcHJldmlvdXMgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbCwgdGVyIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3I6IC0+XG5cbiAgICAgICAgQHNlY3Rpb25zID0gd2luZG93LmNvbmZpZy5yb3V0ZXNcblxuICAgICAgICBAQ0QoKS5yb3V0ZXIub24gUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGNoYW5nZVZpZXdcblxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgIGdldFNlY3Rpb24gOiAoc2VjdGlvbikgPT5cblxuICAgICAgICBpZiBzZWN0aW9uIGlzICcnIHRoZW4gcmV0dXJuIHRydWVcblxuICAgICAgICBmb3Igc2VjdGlvbk5hbWUsIHVyaSBvZiBAc2VjdGlvbnNcbiAgICAgICAgICAgIGlmIHVyaSBpcyBzZWN0aW9uIHRoZW4gcmV0dXJuIHNlY3Rpb25OYW1lXG5cbiAgICAgICAgZmFsc2VcblxuICAgIGNoYW5nZVZpZXc6IChhcmVhLCBzdWIsIHRlciwgcGFyYW1zKSA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJhcmVhXCIsYXJlYVxuICAgICAgICAjIGNvbnNvbGUubG9nIFwic3ViXCIsc3ViXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJ0ZXJcIix0ZXJcbiAgICAgICAgIyBjb25zb2xlLmxvZyBcInBhcmFtc1wiLHBhcmFtc1xuXG4gICAgICAgIEBwcmV2aW91cyA9IEBjdXJyZW50XG4gICAgICAgIEBjdXJyZW50ICA9IGFyZWEgOiBhcmVhLCBzdWIgOiBzdWIsIHRlciA6IHRlclxuXG4gICAgICAgIGlmIEBwcmV2aW91cy5hcmVhIGFuZCBAcHJldmlvdXMuYXJlYSBpcyBAY3VycmVudC5hcmVhXG4gICAgICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBAY3VycmVudFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBAdHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBwcmV2aW91cywgQGN1cnJlbnRcbiAgICAgICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjdXJyZW50XG5cbiAgICAgICAgaWYgQENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIuaXNPcGVuKCkgdGhlbiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5oaWRlT3Blbk1vZGFsKClcblxuICAgICAgICBAc2V0UGFnZVRpdGxlIGFyZWEsIHN1YiwgdGVyXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZVRpdGxlOiAoYXJlYSwgc3ViLCB0ZXIpID0+XG5cbiAgICAgICAgdGl0bGUgPSBcIlBBR0UgVElUTEUgSEVSRSAtIExPQ0FMSVNFIEJBU0VEIE9OIFVSTFwiXG5cbiAgICAgICAgaWYgd2luZG93LmRvY3VtZW50LnRpdGxlIGlzbnQgdGl0bGUgdGhlbiB3aW5kb3cuZG9jdW1lbnQudGl0bGUgPSB0aXRsZVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBOYXZcbiIsImNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4gICAgQEVWRU5UX0hBU0hfQ0hBTkdFRCA6ICdFVkVOVF9IQVNIX0NIQU5HRUQnXG5cbiAgICBGSVJTVF9ST1VURSA6IHRydWVcblxuICAgIHJvdXRlcyA6XG4gICAgICAgICcoLykoOmFyZWEpKC86c3ViKSgvOnRlcikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgICAgICAgICA6ICduYXZpZ2F0ZVRvJ1xuXG4gICAgYXJlYSAgIDogbnVsbFxuICAgIHN1YiAgICA6IG51bGxcbiAgICB0ZXIgICAgOiBudWxsXG4gICAgcGFyYW1zIDogbnVsbFxuXG4gICAgc3RhcnQgOiA9PlxuXG4gICAgICAgIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQgXG4gICAgICAgICAgICBwdXNoU3RhdGUgOiB0cnVlXG4gICAgICAgICAgICByb290ICAgICAgOiAnLydcblxuICAgICAgICBudWxsXG5cbiAgICBoYXNoQ2hhbmdlZCA6IChAYXJlYSA9IG51bGwsIEBzdWIgPSBudWxsLCBAdGVyID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSwgQHRlciA9ICN7QHRlcn0gPDxcIlxuXG4gICAgICAgIGlmIEBGSVJTVF9ST1VURSB0aGVuIEBGSVJTVF9ST1VURSA9IGZhbHNlXG5cbiAgICAgICAgaWYgIUBhcmVhIHRoZW4gQGFyZWEgPSBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXG4gICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBhcmVhLCBAc3ViLCBAdGVyLCBAcGFyYW1zXG5cbiAgICAgICAgbnVsbFxuXG4gICAgbmF2aWdhdGVUbyA6ICh3aGVyZSA9ICcnLCB0cmlnZ2VyID0gdHJ1ZSwgcmVwbGFjZSA9IGZhbHNlLCBAcGFyYW1zKSA9PlxuXG4gICAgICAgIGlmIHdoZXJlLmNoYXJBdCgwKSBpc250IFwiL1wiXG4gICAgICAgICAgICB3aGVyZSA9IFwiLyN7d2hlcmV9XCJcbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KCB3aGVyZS5sZW5ndGgtMSApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIje3doZXJlfS9cIlxuXG4gICAgICAgIGlmICF0cmlnZ2VyXG4gICAgICAgICAgICBAdHJpZ2dlciBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCB3aGVyZSwgbnVsbCwgQHBhcmFtc1xuICAgICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQG5hdmlnYXRlIHdoZXJlLCB0cmlnZ2VyOiB0cnVlLCByZXBsYWNlOiByZXBsYWNlXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQ0QgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXJcbiIsIiMjI1xuQW5hbHl0aWNzIHdyYXBwZXJcbiMjI1xuY2xhc3MgQW5hbHl0aWNzXG5cbiAgICB0YWdzICAgIDogbnVsbFxuICAgIHN0YXJ0ZWQgOiBmYWxzZVxuXG4gICAgYXR0ZW1wdHMgICAgICAgIDogMFxuICAgIGFsbG93ZWRBdHRlbXB0cyA6IDVcblxuICAgIGNvbnN0cnVjdG9yIDogKHRhZ3MsIEBjYWxsYmFjaykgLT5cblxuICAgICAgICAkLmdldEpTT04gdGFncywgQG9uVGFnc1JlY2VpdmVkXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgIG9uVGFnc1JlY2VpdmVkIDogKGRhdGEpID0+XG5cbiAgICAgICAgQHRhZ3MgICAgPSBkYXRhXG4gICAgICAgIEBzdGFydGVkID0gdHJ1ZVxuICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBudWxsXG5cbiAgICAjIyNcbiAgICBAcGFyYW0gc3RyaW5nIGlkIG9mIHRoZSB0cmFja2luZyB0YWcgdG8gYmUgcHVzaGVkIG9uIEFuYWx5dGljcyBcbiAgICAjIyNcbiAgICB0cmFjayA6IChwYXJhbSkgPT5cblxuICAgICAgICByZXR1cm4gaWYgIUBzdGFydGVkXG5cbiAgICAgICAgaWYgcGFyYW1cblxuICAgICAgICAgICAgdiA9IEB0YWdzW3BhcmFtXVxuXG4gICAgICAgICAgICBpZiB2XG5cbiAgICAgICAgICAgICAgICBhcmdzID0gWydzZW5kJywgJ2V2ZW50J11cbiAgICAgICAgICAgICAgICAoIGFyZ3MucHVzaChhcmcpICkgZm9yIGFyZyBpbiB2XG5cbiAgICAgICAgICAgICAgICAjIGxvYWRpbmcgR0EgYWZ0ZXIgbWFpbiBhcHAgSlMsIHNvIGV4dGVybmFsIHNjcmlwdCBtYXkgbm90IGJlIGhlcmUgeWV0XG4gICAgICAgICAgICAgICAgaWYgd2luZG93LmdhXG4gICAgICAgICAgICAgICAgICAgIGdhLmFwcGx5IG51bGwsIGFyZ3NcbiAgICAgICAgICAgICAgICBlbHNlIGlmIEBhdHRlbXB0cyA+PSBAYWxsb3dlZEF0dGVtcHRzXG4gICAgICAgICAgICAgICAgICAgIEBzdGFydGVkID0gZmFsc2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIEB0cmFjayBwYXJhbVxuICAgICAgICAgICAgICAgICAgICAgICAgQGF0dGVtcHRzKytcbiAgICAgICAgICAgICAgICAgICAgLCAyMDAwXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5dGljc1xuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuLi91dGlscy9GYWNlYm9vaydcbkdvb2dsZVBsdXMgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0dvb2dsZVBsdXMnXG5cbmNsYXNzIEF1dGhNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0dXNlckRhdGEgIDogbnVsbFxuXG5cdCMgQHByb2Nlc3MgdHJ1ZSBkdXJpbmcgbG9naW4gcHJvY2Vzc1xuXHRwcm9jZXNzICAgICAgOiBmYWxzZVxuXHRwcm9jZXNzVGltZXIgOiBudWxsXG5cdHByb2Nlc3NXYWl0ICA6IDUwMDBcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdXNlckRhdGEgID0gQENEKCkuYXBwRGF0YS5VU0VSXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGxvZ2luIDogKHNlcnZpY2UsIGNiPW51bGwpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwiKysrKyBQUk9DRVNTIFwiLEBwcm9jZXNzXG5cblx0XHRyZXR1cm4gaWYgQHByb2Nlc3NcblxuXHRcdEBzaG93TG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IHRydWVcblxuXHRcdCRkYXRhRGZkID0gJC5EZWZlcnJlZCgpXG5cblx0XHRzd2l0Y2ggc2VydmljZVxuXHRcdFx0d2hlbiAnZ29vZ2xlJ1xuXHRcdFx0XHRHb29nbGVQbHVzLmxvZ2luICRkYXRhRGZkXG5cdFx0XHR3aGVuICdmYWNlYm9vaydcblx0XHRcdFx0RmFjZWJvb2subG9naW4gJGRhdGFEZmRcblxuXHRcdCRkYXRhRGZkLmRvbmUgKHJlcykgPT4gQGF1dGhTdWNjZXNzIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmZhaWwgKHJlcykgPT4gQGF1dGhGYWlsIHNlcnZpY2UsIHJlc1xuXHRcdCRkYXRhRGZkLmFsd2F5cyAoKSA9PiBAYXV0aENhbGxiYWNrIGNiXG5cblx0XHQjIyNcblx0XHRVbmZvcnR1bmF0ZWx5IG5vIGNhbGxiYWNrIGlzIGZpcmVkIGlmIHVzZXIgbWFudWFsbHkgY2xvc2VzIEcrIGxvZ2luIG1vZGFsLFxuXHRcdHNvIHRoaXMgaXMgdG8gYWxsb3cgdGhlbSB0byBjbG9zZSB3aW5kb3cgYW5kIHRoZW4gc3Vic2VxdWVudGx5IHRyeSB0byBsb2cgaW4gYWdhaW4uLi5cblx0XHQjIyNcblx0XHRAcHJvY2Vzc1RpbWVyID0gc2V0VGltZW91dCBAYXV0aENhbGxiYWNrLCBAcHJvY2Vzc1dhaXRcblxuXHRcdCRkYXRhRGZkXG5cblx0YXV0aFN1Y2Nlc3MgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBjYWxsYmFjayBmb3IgI3tzZXJ2aWNlfSwgZGF0YSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhGYWlsIDogKHNlcnZpY2UsIGRhdGEpID0+XG5cblx0XHQjIGNvbnNvbGUubG9nIFwibG9naW4gZmFpbCBmb3IgI3tzZXJ2aWNlfSA9PiBcIiwgZGF0YVxuXG5cdFx0bnVsbFxuXG5cdGF1dGhDYWxsYmFjayA6IChjYj1udWxsKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBAcHJvY2Vzc1xuXG5cdFx0Y2xlYXJUaW1lb3V0IEBwcm9jZXNzVGltZXJcblxuXHRcdEBoaWRlTG9hZGVyKClcblx0XHRAcHJvY2VzcyA9IGZhbHNlXG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdCMjI1xuXHRzaG93IC8gaGlkZSBzb21lIFVJIGluZGljYXRvciB0aGF0IHdlIGFyZSB3YWl0aW5nIGZvciBzb2NpYWwgbmV0d29yayB0byByZXNwb25kXG5cdCMjI1xuXHRzaG93TG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJzaG93TG9hZGVyXCJcblxuXHRcdG51bGxcblxuXHRoaWRlTG9hZGVyIDogPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJoaWRlTG9hZGVyXCJcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRoTWFuYWdlclxuIiwiY2xhc3MgQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxuXHRAY29uZmlnIDpcblx0XHRNSU5fV1JPTkdfQ0hBUlMgOiAwXG5cdFx0TUFYX1dST05HX0NIQVJTIDogM1xuXG5cdFx0TUlOX0NIQVJfSU5fREVMQVkgOiA0MFxuXHRcdE1BWF9DSEFSX0lOX0RFTEFZIDogNzBcblxuXHRcdE1JTl9DSEFSX09VVF9ERUxBWSA6IDQwXG5cdFx0TUFYX0NIQVJfT1VUX0RFTEFZIDogNzBcblxuXHRcdENIQVJTIDogJ2FiY2RlZmhpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5IT8qKClAwqMkJV4mXy0rPVtde306O1xcJ1wiXFxcXHw8PiwuL35gJy5zcGxpdCgnJylcblxuXHRcdENIQVJfVEVNUExBVEUgOiBcIjxzcGFuIGRhdGEtY29kZXRleHQtY2hhcj1cXFwie3sgY2hhciB9fVxcXCI+e3sgY2hhciB9fTwvc3Bhbj5cIlxuXG5cdEBfd29yZENhY2hlIDoge31cblxuXHRAX2dldFdvcmRGcm9tQ2FjaGUgOiAoJGVsKSA9PlxuXG5cdFx0aWQgPSAkZWwuYXR0cignZGF0YS1jb2Rld29yZC1pZCcpXG5cblx0XHRpZiBpZCBhbmQgQF93b3JkQ2FjaGVbIGlkIF1cblx0XHRcdHdvcmQgPSBAX3dvcmRDYWNoZVsgaWQgXVxuXHRcdGVsc2Vcblx0XHRcdEBfd3JhcENoYXJzICRlbFxuXHRcdFx0d29yZCA9IEBfYWRkV29yZFRvQ2FjaGUgJGVsXG5cblx0XHR3b3JkXG5cblx0QF9hZGRXb3JkVG9DYWNoZSA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9IFtdXG5cblx0XHQkZWwuZmluZCgnW2RhdGEtY29kZXRleHQtY2hhcl0nKS5lYWNoIChpLCBlbCkgPT5cblx0XHRcdCRjaGFyRWwgPSAkKGVsKVxuXHRcdFx0Y2hhcnMucHVzaFxuXHRcdFx0XHQkZWwgICAgICAgIDogJGNoYXJFbFxuXHRcdFx0XHRyaWdodENoYXIgIDogJGNoYXJFbC5hdHRyKCdkYXRhLWNvZGV0ZXh0LWNoYXInKVxuXG5cdFx0aWQgPSBfLnVuaXF1ZUlkKClcblx0XHQkZWwuYXR0ciAnZGF0YS1jb2Rld29yZC1pZCcsIGlkXG5cblx0XHRAX3dvcmRDYWNoZVsgaWQgXSA9XG5cdFx0XHR3b3JkICAgIDogXy5wbHVjayhjaGFycywgJ3JpZ2h0Q2hhcicpLmpvaW4oJycpXG5cdFx0XHQkZWwgICAgIDogJGVsXG5cdFx0XHRjaGFycyAgIDogY2hhcnNcblx0XHRcdHZpc2libGUgOiBmYWxzZVxuXG5cdFx0QF93b3JkQ2FjaGVbIGlkIF1cblxuXHRAX3dyYXBDaGFycyA6ICgkZWwpID0+XG5cblx0XHRjaGFycyA9ICRlbC50ZXh0KCkuc3BsaXQoJycpXG5cdFx0aHRtbCA9IFtdXG5cdFx0Zm9yIGNoYXIgaW4gY2hhcnNcblx0XHRcdGh0bWwucHVzaCBAX3N1cHBsYW50U3RyaW5nIEBjb25maWcuQ0hBUl9URU1QTEFURSwgY2hhciA6IGNoYXJcblxuXHRcdCRlbC5odG1sIGh0bWwuam9pbignJylcblxuXHRcdG51bGxcblxuXHRAX2lzV29yZEVtcHR5IDogKHdvcmQpID0+XG5cblx0XHRudWxsXG5cblx0IyBAcGFyYW0gdGFyZ2V0ID0gJ3JpZ2h0JywgJ3dyb25nJywgJ2VtcHR5J1xuXHRAX3ByZXBhcmVXb3JkIDogKHdvcmQsIHRhcmdldCwgY2hhclN0YXRlPScnKSA9PlxuXG5cdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXG5cdFx0XHR0YXJnZXRDaGFyID0gc3dpdGNoIHRydWVcblx0XHRcdFx0d2hlbiB0YXJnZXQgaXMgJ3JpZ2h0JyB0aGVuIGNoYXIucmlnaHRDaGFyXG5cdFx0XHRcdHdoZW4gdGFyZ2V0IGlzICd3cm9uZycgdGhlbiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHRlbHNlICcnXG5cblx0XHRcdGNoYXIud3JvbmdDaGFycyA9IEBfZ2V0UmFuZG9tV3JvbmdDaGFycygpXG5cdFx0XHRjaGFyLnRhcmdldENoYXIgPSB0YXJnZXRDaGFyXG5cdFx0XHRjaGFyLmNoYXJTdGF0ZSAgPSBjaGFyU3RhdGVcblxuXHRcdG51bGxcblxuXHRAX2dldFJhbmRvbVdyb25nQ2hhcnMgOiA9PlxuXG5cdFx0Y2hhcnMgPSBbXVxuXG5cdFx0Y2hhckNvdW50ID0gXy5yYW5kb20gQGNvbmZpZy5NSU5fV1JPTkdfQ0hBUlMsIEBjb25maWcuTUFYX1dST05HX0NIQVJTXG5cblx0XHRmb3IgaSBpbiBbMC4uLmNoYXJDb3VudF1cblx0XHRcdGNoYXJzLnB1c2hcblx0XHRcdFx0Y2hhciAgICAgOiBAX2dldFJhbmRvbUNoYXIoKVxuXHRcdFx0XHRpbkRlbGF5ICA6IF8ucmFuZG9tIEBjb25maWcuTUlOX0NIQVJfSU5fREVMQVksIEBjb25maWcuTUFYX0NIQVJfSU5fREVMQVlcblx0XHRcdFx0b3V0RGVsYXkgOiBfLnJhbmRvbSBAY29uZmlnLk1JTl9DSEFSX09VVF9ERUxBWSwgQGNvbmZpZy5NQVhfQ0hBUl9PVVRfREVMQVlcblxuXHRcdGNoYXJzXG5cblx0QF9nZXRSYW5kb21DaGFyIDogPT5cblxuXHRcdGNoYXIgPSBAY29uZmlnLkNIQVJTWyBfLnJhbmRvbSgwLCBAY29uZmlnLkNIQVJTLmxlbmd0aC0xKSBdXG5cblx0XHRjaGFyXG5cblx0QF9nZXRMb25nZXN0Q2hhckR1cmF0aW9uIDogKGNoYXJzKSA9PlxuXG5cdFx0bG9uZ2VzdFRpbWUgPSAwXG5cdFx0bG9uZ2VzdFRpbWVJZHggPSAwXG5cblx0XHRmb3IgY2hhciwgaSBpbiBjaGFyc1xuXG5cdFx0XHR0aW1lID0gMFxuXHRcdFx0KHRpbWUgKz0gd3JvbmdDaGFyLmluRGVsYXkgKyB3cm9uZ0NoYXIub3V0RGVsYXkpIGZvciB3cm9uZ0NoYXIgaW4gY2hhci53cm9uZ0NoYXJzXG5cdFx0XHRpZiB0aW1lID4gbG9uZ2VzdFRpbWVcblx0XHRcdFx0bG9uZ2VzdFRpbWUgPSB0aW1lXG5cdFx0XHRcdGxvbmdlc3RUaW1lSWR4ID0gaVxuXG5cdFx0bG9uZ2VzdFRpbWVJZHhcblxuXHRAX2FuaW1hdGVDaGFycyA6ICh3b3JkLCBzZXF1ZW50aWFsLCBjYikgPT5cblxuXHRcdGFjdGl2ZUNoYXIgPSAwXG5cblx0XHRpZiBzZXF1ZW50aWFsXG5cdFx0XHRAX2FuaW1hdGVDaGFyIHdvcmQuY2hhcnMsIGFjdGl2ZUNoYXIsIHRydWUsIGNiXG5cdFx0ZWxzZVxuXHRcdFx0bG9uZ2VzdENoYXJJZHggPSBAX2dldExvbmdlc3RDaGFyRHVyYXRpb24gd29yZC5jaGFyc1xuXHRcdFx0Zm9yIGNoYXIsIGkgaW4gd29yZC5jaGFyc1xuXHRcdFx0XHRhcmdzID0gWyB3b3JkLmNoYXJzLCBpLCBmYWxzZSBdXG5cdFx0XHRcdGlmIGkgaXMgbG9uZ2VzdENoYXJJZHggdGhlbiBhcmdzLnB1c2ggY2Jcblx0XHRcdFx0QF9hbmltYXRlQ2hhci5hcHBseSBALCBhcmdzXG5cblx0XHRudWxsXG5cblx0QF9hbmltYXRlQ2hhciA6IChjaGFycywgaWR4LCByZWN1cnNlLCBjYikgPT5cblxuXHRcdGNoYXIgPSBjaGFyc1tpZHhdXG5cblx0XHRpZiByZWN1cnNlXG5cblx0XHRcdEBfYW5pbWF0ZVdyb25nQ2hhcnMgY2hhciwgPT5cblxuXHRcdFx0XHRpZiBpZHggaXMgY2hhcnMubGVuZ3RoLTFcblx0XHRcdFx0XHRAX2FuaW1hdGVDaGFyc0RvbmUgY2Jcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdEBfYW5pbWF0ZUNoYXIgY2hhcnMsIGlkeCsxLCByZWN1cnNlLCBjYlxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRpZiB0eXBlb2YgY2IgaXMgJ2Z1bmN0aW9uJ1xuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsID0+IEBfYW5pbWF0ZUNoYXJzRG9uZSBjYlxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXJcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVXcm9uZ0NoYXJzIDogKGNoYXIsIGNiKSA9PlxuXG5cdFx0Y2hhci4kZWwuYXR0cignZGF0YS1jb2RldGV4dC1jaGFyLXN0YXRlJywgY2hhci5jaGFyU3RhdGUpXG5cblx0XHRpZiBjaGFyLndyb25nQ2hhcnMubGVuZ3RoXG5cblx0XHRcdHdyb25nQ2hhciA9IGNoYXIud3JvbmdDaGFycy5zaGlmdCgpXG5cblx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0Y2hhci4kZWwuaHRtbCB3cm9uZ0NoYXIuY2hhclxuXG5cdFx0XHRcdHNldFRpbWVvdXQgPT5cblx0XHRcdFx0XHQjIGNoYXIuJGVsLmh0bWwgJydcblx0XHRcdFx0XHRAX2FuaW1hdGVXcm9uZ0NoYXJzIGNoYXIsIGNiXG5cdFx0XHRcdCwgd3JvbmdDaGFyLm91dERlbGF5XG5cblx0XHRcdCwgd3JvbmdDaGFyLmluRGVsYXlcblxuXHRcdGVsc2VcblxuXHRcdFx0Y2hhci4kZWwuaHRtbCBjaGFyLnRhcmdldENoYXJcblxuXHRcdFx0Y2I/KClcblxuXHRcdG51bGxcblxuXHRAX2FuaW1hdGVDaGFyc0RvbmUgOiAoY2IpID0+XG5cblx0XHRjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdEBfc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSA9PlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgPT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QGluIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBpbihfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0d29yZC52aXNpYmxlID0gdHJ1ZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAncmlnaHQnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEBvdXQgOiAoJGVsLCBjaGFyU3RhdGUsIHNlcXVlbnRpYWw9ZmFsc2UsIGNiPW51bGwpID0+XG5cblx0XHRpZiBfLmlzQXJyYXkgJGVsXG5cdFx0XHQoQG91dChfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cdFx0cmV0dXJuIGlmICF3b3JkLnZpc2libGVcblxuXHRcdHdvcmQudmlzaWJsZSA9IGZhbHNlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdlbXB0eScsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cblx0QHNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEBzY3JhbWJsZShfJGVsLCBjaGFyU3RhdGUsIGNiKSkgZm9yIF8kZWwgaW4gJGVsXG5cdFx0XHRyZXR1cm5cblxuXHRcdHdvcmQgPSBAX2dldFdvcmRGcm9tQ2FjaGUgJGVsXG5cblx0XHRyZXR1cm4gaWYgIXdvcmQudmlzaWJsZVxuXG5cdFx0QF9wcmVwYXJlV29yZCB3b3JkLCAnd3JvbmcnLCBjaGFyU3RhdGVcblx0XHRAX2FuaW1hdGVDaGFycyB3b3JkLCBzZXF1ZW50aWFsLCBjYlxuXG5cdFx0bnVsbFxuXG5cdEB1bnNjcmFtYmxlIDogKCRlbCwgY2hhclN0YXRlLCBzZXF1ZW50aWFsPWZhbHNlLCBjYj1udWxsKSA9PlxuXG5cdFx0aWYgXy5pc0FycmF5ICRlbFxuXHRcdFx0KEB1bnNjcmFtYmxlKF8kZWwsIGNoYXJTdGF0ZSwgY2IpKSBmb3IgXyRlbCBpbiAkZWxcblx0XHRcdHJldHVyblxuXG5cdFx0d29yZCA9IEBfZ2V0V29yZEZyb21DYWNoZSAkZWxcblxuXHRcdHJldHVybiBpZiAhd29yZC52aXNpYmxlXG5cblx0XHRAX3ByZXBhcmVXb3JkIHdvcmQsICdyaWdodCcsIGNoYXJTdGF0ZVxuXHRcdEBfYW5pbWF0ZUNoYXJzIHdvcmQsIHNlcXVlbnRpYWwsIGNiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQ29kZVdvcmRUcmFuc2l0aW9uZXJcblxud2luZG93LkNvZGVXb3JkVHJhbnNpdGlvbmVyPSBDb2RlV29yZFRyYW5zaXRpb25lclxuIiwiQWJzdHJhY3REYXRhID0gcmVxdWlyZSAnLi4vZGF0YS9BYnN0cmFjdERhdGEnXG5cbiMjI1xuXG5GYWNlYm9vayBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBGYWNlYm9vayBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICAgICA6ICcvL2Nvbm5lY3QuZmFjZWJvb2submV0L2VuX1VTL2FsbC5qcydcblxuXHRAcGVybWlzc2lvbnMgOiAnZW1haWwnXG5cblx0QCRkYXRhRGZkICAgIDogbnVsbFxuXHRAbG9hZGVkICAgICAgOiBmYWxzZVxuXG5cdEBsb2FkIDogPT5cblxuXHRcdCMjI1xuXHRcdFRPIERPXG5cdFx0aW5jbHVkZSBzY3JpcHQgbG9hZGVyIHdpdGggY2FsbGJhY2sgdG8gOmluaXRcblx0XHQjIyNcblx0XHQjIHJlcXVpcmUgW0B1cmxdLCBAaW5pdFxuXG5cdFx0bnVsbFxuXG5cdEBpbml0IDogPT5cblxuXHRcdEBsb2FkZWQgPSB0cnVlXG5cblx0XHRGQi5pbml0XG5cdFx0XHRhcHBJZCAgOiB3aW5kb3cuY29uZmlnLmZiX2FwcF9pZFxuXHRcdFx0c3RhdHVzIDogZmFsc2Vcblx0XHRcdHhmYm1sICA6IGZhbHNlXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmICFAbG9hZGVkIHRoZW4gcmV0dXJuIEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0RkIubG9naW4gKCByZXMgKSA9PlxuXG5cdFx0XHRpZiByZXNbJ3N0YXR1cyddIGlzICdjb25uZWN0ZWQnXG5cdFx0XHRcdEBnZXRVc2VyRGF0YSByZXNbJ2F1dGhSZXNwb25zZSddWydhY2Nlc3NUb2tlbiddXG5cdFx0XHRlbHNlXG5cdFx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0LCB7IHNjb3BlOiBAcGVybWlzc2lvbnMgfVxuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdHVzZXJEYXRhID0ge31cblx0XHR1c2VyRGF0YS5hY2Nlc3NfdG9rZW4gPSB0b2tlblxuXG5cdFx0JG1lRGZkICAgPSAkLkRlZmVycmVkKClcblx0XHQkcGljRGZkICA9ICQuRGVmZXJyZWQoKVxuXG5cdFx0RkIuYXBpICcvbWUnLCAocmVzKSAtPlxuXG5cdFx0XHR1c2VyRGF0YS5mdWxsX25hbWUgPSByZXMubmFtZVxuXHRcdFx0dXNlckRhdGEuc29jaWFsX2lkID0gcmVzLmlkXG5cdFx0XHR1c2VyRGF0YS5lbWFpbCAgICAgPSByZXMuZW1haWwgb3IgZmFsc2Vcblx0XHRcdCRtZURmZC5yZXNvbHZlKClcblxuXHRcdEZCLmFwaSAnL21lL3BpY3R1cmUnLCB7ICd3aWR0aCc6ICcyMDAnIH0sIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLnByb2ZpbGVfcGljID0gcmVzLmRhdGEudXJsXG5cdFx0XHQkcGljRGZkLnJlc29sdmUoKVxuXG5cdFx0JC53aGVuKCRtZURmZCwgJHBpY0RmZCkuZG9uZSA9PiBAJGRhdGFEZmQucmVzb2x2ZSB1c2VyRGF0YVxuXG5cdFx0bnVsbFxuXG5cdEBzaGFyZSA6IChvcHRzLCBjYikgPT5cblxuXHRcdEZCLnVpIHtcblx0XHRcdG1ldGhvZCAgICAgIDogb3B0cy5tZXRob2Qgb3IgJ2ZlZWQnXG5cdFx0XHRuYW1lICAgICAgICA6IG9wdHMubmFtZSBvciAnJ1xuXHRcdFx0bGluayAgICAgICAgOiBvcHRzLmxpbmsgb3IgJydcblx0XHRcdHBpY3R1cmUgICAgIDogb3B0cy5waWN0dXJlIG9yICcnXG5cdFx0XHRjYXB0aW9uICAgICA6IG9wdHMuY2FwdGlvbiBvciAnJ1xuXHRcdFx0ZGVzY3JpcHRpb24gOiBvcHRzLmRlc2NyaXB0aW9uIG9yICcnXG5cdFx0fSwgKHJlc3BvbnNlKSAtPlxuXHRcdFx0Y2I/KHJlc3BvbnNlKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEZhY2Vib29rXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkdvb2dsZSsgU0RLIHdyYXBwZXIgLSBsb2FkIGFzeW5jaHJvbm91c2x5LCBzb21lIGhlbHBlciBtZXRob2RzXG5cbiMjI1xuY2xhc3MgR29vZ2xlUGx1cyBleHRlbmRzIEFic3RyYWN0RGF0YVxuXG5cdEB1cmwgICAgICA6ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQ6cGx1c29uZS5qcydcblxuXHRAcGFyYW1zICAgOlxuXHRcdCdjbGllbnRpZCcgICAgIDogbnVsbFxuXHRcdCdjYWxsYmFjaycgICAgIDogbnVsbFxuXHRcdCdzY29wZScgICAgICAgIDogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8uZW1haWwnXG5cdFx0J2Nvb2tpZXBvbGljeScgOiAnbm9uZSdcblxuXHRAJGRhdGFEZmQgOiBudWxsXG5cdEBsb2FkZWQgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEBwYXJhbXNbJ2NsaWVudGlkJ10gPSB3aW5kb3cuY29uZmlnLmdwX2FwcF9pZFxuXHRcdEBwYXJhbXNbJ2NhbGxiYWNrJ10gPSBAbG9naW5DYWxsYmFja1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbiA6IChAJGRhdGFEZmQpID0+XG5cblx0XHRpZiBAbG9hZGVkXG5cdFx0XHRnYXBpLmF1dGguc2lnbkluIEBwYXJhbXNcblx0XHRlbHNlXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdTREsgbm90IGxvYWRlZCdcblxuXHRcdG51bGxcblxuXHRAbG9naW5DYWxsYmFjayA6IChyZXMpID0+XG5cblx0XHRpZiByZXNbJ3N0YXR1cyddWydzaWduZWRfaW4nXVxuXHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYWNjZXNzX3Rva2VuJ11cblx0XHRlbHNlIGlmIHJlc1snZXJyb3InXVsnYWNjZXNzX2RlbmllZCddXG5cdFx0XHRAJGRhdGFEZmQucmVqZWN0ICdubyB3YXkgam9zZSdcblxuXHRcdG51bGxcblxuXHRAZ2V0VXNlckRhdGEgOiAodG9rZW4pID0+XG5cblx0XHRnYXBpLmNsaWVudC5sb2FkICdwbHVzJywndjEnLCA9PlxuXG5cdFx0XHRyZXF1ZXN0ID0gZ2FwaS5jbGllbnQucGx1cy5wZW9wbGUuZ2V0ICd1c2VySWQnOiAnbWUnXG5cdFx0XHRyZXF1ZXN0LmV4ZWN1dGUgKHJlcykgPT5cblxuXHRcdFx0XHR1c2VyRGF0YSA9XG5cdFx0XHRcdFx0YWNjZXNzX3Rva2VuIDogdG9rZW5cblx0XHRcdFx0XHRmdWxsX25hbWUgICAgOiByZXMuZGlzcGxheU5hbWVcblx0XHRcdFx0XHRzb2NpYWxfaWQgICAgOiByZXMuaWRcblx0XHRcdFx0XHRlbWFpbCAgICAgICAgOiBpZiByZXMuZW1haWxzWzBdIHRoZW4gcmVzLmVtYWlsc1swXS52YWx1ZSBlbHNlIGZhbHNlXG5cdFx0XHRcdFx0cHJvZmlsZV9waWMgIDogcmVzLmltYWdlLnVybFxuXG5cdFx0XHRcdEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlUGx1c1xuIiwiIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIE1lZGlhIFF1ZXJpZXMgTWFuYWdlciBcbiMgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgICBcbiMgICBAYXV0aG9yIDogRsOhYmlvIEF6ZXZlZG8gPGZhYmlvLmF6ZXZlZG9AdW5pdDkuY29tPiBVTklUOVxuIyAgIEBkYXRlICAgOiBTZXB0ZW1iZXIgMTRcbiMgICBcbiMgICBJbnN0cnVjdGlvbnMgYXJlIG9uIC9wcm9qZWN0L3Nhc3MvdXRpbHMvX3Jlc3BvbnNpdmUuc2Nzcy5cblxuY2xhc3MgTWVkaWFRdWVyaWVzXG5cbiAgICAjIEJyZWFrcG9pbnRzXG4gICAgQFNNQUxMICAgICAgIDogXCJzbWFsbFwiXG4gICAgQElQQUQgICAgICAgIDogXCJpcGFkXCJcbiAgICBATUVESVVNICAgICAgOiBcIm1lZGl1bVwiXG4gICAgQExBUkdFICAgICAgIDogXCJsYXJnZVwiXG4gICAgQEVYVFJBX0xBUkdFIDogXCJleHRyYS1sYXJnZVwiXG5cbiAgICBAc2V0dXAgOiA9PlxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIlNtYWxsXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLlNNQUxMXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UID0ge25hbWU6IFwiTWVkaXVtXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLk1FRElVTV19XG4gICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UICA9IHtuYW1lOiBcIkxhcmdlXCIsIGJyZWFrcG9pbnRzOiBbTWVkaWFRdWVyaWVzLklQQUQsIE1lZGlhUXVlcmllcy5MQVJHRSwgTWVkaWFRdWVyaWVzLkVYVFJBX0xBUkdFXX1cblxuICAgICAgICBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMgPSBbXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuU01BTExfQlJFQUtQT0lOVFxuICAgICAgICAgICAgTWVkaWFRdWVyaWVzLk1FRElVTV9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTEFSR0VfQlJFQUtQT0lOVFxuICAgICAgICBdXG4gICAgICAgIHJldHVyblxuXG4gICAgQGdldERldmljZVN0YXRlIDogPT5cblxuICAgICAgICByZXR1cm4gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgXCJhZnRlclwiKS5nZXRQcm9wZXJ0eVZhbHVlKFwiY29udGVudFwiKTtcblxuICAgIEBnZXRCcmVha3BvaW50IDogPT5cblxuICAgICAgICBzdGF0ZSA9IE1lZGlhUXVlcmllcy5nZXREZXZpY2VTdGF0ZSgpXG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5NZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFMubGVuZ3RoXVxuICAgICAgICAgICAgaWYgTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLmJyZWFrcG9pbnRzLmluZGV4T2Yoc3RhdGUpID4gLTFcbiAgICAgICAgICAgICAgICByZXR1cm4gTWVkaWFRdWVyaWVzLkJSRUFLUE9JTlRTW2ldLm5hbWVcblxuICAgICAgICByZXR1cm4gXCJcIlxuXG4gICAgQGlzQnJlYWtwb2ludCA6IChicmVha3BvaW50KSA9PlxuXG4gICAgICAgIGZvciBpIGluIFswLi4uYnJlYWtwb2ludC5icmVha3BvaW50cy5sZW5ndGhdXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIGJyZWFrcG9pbnQuYnJlYWtwb2ludHNbaV0gPT0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhUXVlcmllcyIsIiMjI1xuIyBSZXF1ZXN0ZXIgI1xuXG5XcmFwcGVyIGZvciBgJC5hamF4YCBjYWxsc1xuXG4jIyNcbmNsYXNzIFJlcXVlc3RlclxuXG4gICAgQHJlcXVlc3RzIDogW11cblxuICAgIEByZXF1ZXN0OiAoIGRhdGEgKSA9PlxuICAgICAgICAjIyNcbiAgICAgICAgYGRhdGEgPSB7YDxicj5cbiAgICAgICAgYCAgdXJsICAgICAgICAgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgICB0eXBlICAgICAgICA6IFwiUE9TVC9HRVQvUFVUXCJgPGJyPlxuICAgICAgICBgICBkYXRhICAgICAgICA6IE9iamVjdGA8YnI+XG4gICAgICAgIGAgIGRhdGFUeXBlICAgIDogalF1ZXJ5IGRhdGFUeXBlYDxicj5cbiAgICAgICAgYCAgY29udGVudFR5cGUgOiBTdHJpbmdgPGJyPlxuICAgICAgICBgfWBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgciA9ICQuYWpheCB7XG5cbiAgICAgICAgICAgIHVybCAgICAgICAgIDogZGF0YS51cmxcbiAgICAgICAgICAgIHR5cGUgICAgICAgIDogaWYgZGF0YS50eXBlIHRoZW4gZGF0YS50eXBlIGVsc2UgXCJQT1NUXCIsXG4gICAgICAgICAgICBkYXRhICAgICAgICA6IGlmIGRhdGEuZGF0YSB0aGVuIGRhdGEuZGF0YSBlbHNlIG51bGwsXG4gICAgICAgICAgICBkYXRhVHlwZSAgICA6IGlmIGRhdGEuZGF0YVR5cGUgdGhlbiBkYXRhLmRhdGFUeXBlIGVsc2UgXCJqc29uXCIsXG4gICAgICAgICAgICBjb250ZW50VHlwZSA6IGlmIGRhdGEuY29udGVudFR5cGUgdGhlbiBkYXRhLmNvbnRlbnRUeXBlIGVsc2UgXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLThcIixcbiAgICAgICAgICAgIHByb2Nlc3NEYXRhIDogaWYgZGF0YS5wcm9jZXNzRGF0YSAhPSBudWxsIGFuZCBkYXRhLnByb2Nlc3NEYXRhICE9IHVuZGVmaW5lZCB0aGVuIGRhdGEucHJvY2Vzc0RhdGEgZWxzZSB0cnVlXG5cbiAgICAgICAgfVxuXG4gICAgICAgIHIuZG9uZSBkYXRhLmRvbmVcbiAgICAgICAgci5mYWlsIGRhdGEuZmFpbFxuICAgICAgICBcbiAgICAgICAgclxuXG4gICAgQGFkZEltYWdlIDogKGRhdGEsIGRvbmUsIGZhaWwpID0+XG4gICAgICAgICMjI1xuICAgICAgICAqKiBVc2FnZTogPGJyPlxuICAgICAgICBgZGF0YSA9IGNhbnZhc3MudG9EYXRhVVJMKFwiaW1hZ2UvanBlZ1wiKS5zbGljZShcImRhdGE6aW1hZ2UvanBlZztiYXNlNjQsXCIubGVuZ3RoKWA8YnI+XG4gICAgICAgIGBSZXF1ZXN0ZXIuYWRkSW1hZ2UgZGF0YSwgXCJ6b2V0cm9wZVwiLCBAZG9uZSwgQGZhaWxgXG4gICAgICAgICMjI1xuXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJ1xuICAgICAgICAgICAgdHlwZSAgIDogJ1BPU1QnXG4gICAgICAgICAgICBkYXRhICAgOiB7aW1hZ2VfYmFzZTY0IDogZW5jb2RlVVJJKGRhdGEpfVxuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxuICAgIEBkZWxldGVJbWFnZSA6IChpZCwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgXG4gICAgICAgIEByZXF1ZXN0XG4gICAgICAgICAgICB1cmwgICAgOiAnL2FwaS9pbWFnZXMvJytpZFxuICAgICAgICAgICAgdHlwZSAgIDogJ0RFTEVURSdcbiAgICAgICAgICAgIGRvbmUgICA6IGRvbmVcbiAgICAgICAgICAgIGZhaWwgICA6IGZhaWxcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdGVyXG4iLCIjIyNcblNoYXJpbmcgY2xhc3MgZm9yIG5vbi1TREsgbG9hZGVkIHNvY2lhbCBuZXR3b3Jrcy5cbklmIFNESyBpcyBsb2FkZWQsIGFuZCBwcm92aWRlcyBzaGFyZSBtZXRob2RzLCB0aGVuIHVzZSB0aGF0IGNsYXNzIGluc3RlYWQsIGVnLiBgRmFjZWJvb2suc2hhcmVgIGluc3RlYWQgb2YgYFNoYXJlLmZhY2Vib29rYFxuIyMjXG5jbGFzcyBTaGFyZVxuXG4gICAgdXJsIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAtPlxuXG4gICAgICAgIEB1cmwgPSBAQ0QoKS5CQVNFX1VSTFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHQjIyNcblx0XHRvdmVycmlkZSBvbiBwZXIgdmlldyBiYXNpcyAtIHVuYmluZCBldmVudCBoYW5kbGVycyBldGNcblx0XHQjIyNcblxuXHRcdG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RWaWV3UGFnZSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdF9zaG93biAgICAgOiBmYWxzZVxuXHRfbGlzdGVuaW5nIDogZmFsc2VcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQF9zaG93blxuXHRcdEBfc2hvd24gPSB0cnVlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIuYWRkQ2hpbGQgQFxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb24nXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICd2aXNpYmxlJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQF9zaG93blxuXHRcdEBfc2hvd24gPSBmYWxzZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLnJlbW92ZSBAXG5cblx0XHQjIEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAnaGlkZGVuJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHJldHVybiB1bmxlc3Mgc2V0dGluZyBpc250IEBfbGlzdGVuaW5nXG5cdFx0QF9saXN0ZW5pbmcgPSBzZXR0aW5nXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3UGFnZVxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIEFib3V0UGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1hYm91dCdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0ge31cblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBGb290ZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuUm91dGVyICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvUm91dGVyJ1xuQ29kZVdvcmRUcmFuc2l0aW9uZXIgPSByZXF1aXJlICcuLi8uLi91dGlscy9Db2RlV29yZFRyYW5zaXRpb25lcidcblxuY2xhc3MgSGVhZGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0dGVtcGxhdGUgOiAnc2l0ZS1oZWFkZXInXG5cblx0RklSU1RfSEFTSENIQU5HRSA6IHRydWVcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID1cblx0XHRcdGhvbWUgICAgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfbG9nb19sYWJlbCcpXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9VUkwgKyAnLycgKyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0YWJvdXQgOiBcblx0XHRcdFx0bGFiZWwgICAgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfYWJvdXRfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkFCT1VUXG5cdFx0XHRjb250cmlidXRlIDogXG5cdFx0XHRcdGxhYmVsICAgIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2NvbnRyaWJ1dGVfbGFiZWwnKVxuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfVVJMICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblx0XHRcdGNsb3NlX2xhYmVsIDogQENEKCkubG9jYWxlLmdldCgnaGVhZGVyX2Nsb3NlX2xhYmVsJylcblx0XHRcdGluZm9fbGFiZWwgOiBAQ0QoKS5sb2NhbGUuZ2V0KCdoZWFkZXJfaW5mb19sYWJlbCcpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAYmluZEV2ZW50cygpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRsb2dvICAgICAgICAgICAgICA9IEAkZWwuZmluZCgnLmxvZ29fX2xpbmsnKVxuXHRcdEAkbmF2TGlua0Fib3V0ICAgICAgPSBAJGVsLmZpbmQoJy5zaXRlLW5hdl9fbGluaycpLmVxKDApXG5cdFx0QCRuYXZMaW5rQ29udHJpYnV0ZSA9IEAkZWwuZmluZCgnLnNpdGUtbmF2X19saW5rJykuZXEoMSlcblx0XHRAJGluZm9CdG4gICAgICAgICAgID0gQCRlbC5maW5kKCcuaW5mby1idG4nKVxuXHRcdEAkY2xvc2VCdG4gICAgICAgICAgPSBAJGVsLmZpbmQoJy5jbG9zZS1idG4nKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkucm91dGVyLm9uIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIEBvbkhhc2hDaGFuZ2VcblxuXHRcdEAkZWwub24gJ21vdXNlZW50ZXInLCAnW2RhdGEtY29kZXdvcmRdJywgQG9uV29yZEVudGVyXG5cdFx0QCRlbC5vbiAnbW91c2VsZWF2ZScsICdbZGF0YS1jb2Rld29yZF0nLCBAb25Xb3JkTGVhdmVcblxuXHRcdG51bGxcblxuXHRvbkhhc2hDaGFuZ2UgOiAod2hlcmUpID0+XG5cblx0XHRpZiBARklSU1RfSEFTSENIQU5HRVxuXHRcdFx0QEZJUlNUX0hBU0hDSEFOR0UgPSBmYWxzZVxuXHRcdFx0cmV0dXJuXG5cdFx0XG5cdFx0QG9uQXJlYUNoYW5nZSB3aGVyZVxuXG5cdFx0bnVsbFxuXG5cdG9uQXJlYUNoYW5nZSA6IChzZWN0aW9uKSA9PlxuXG5cdFx0Y29sb3VyICA9IEBnZXRTZWN0aW9uQ29sb3VyIHNlY3Rpb25cblxuXHRcdEAkZWwuYXR0ciAnZGF0YS1zZWN0aW9uJywgc2VjdGlvblxuXG5cdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gQCRsb2dvLCBjb2xvdXJcblxuXHRcdCMgdGhpcyBqdXN0IGZvciB0ZXN0aW5nLCB0aWR5IGxhdGVyXG5cdFx0aWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRVxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdGVsc2UgaWYgc2VjdGlvbiBpcyBAQ0QoKS5uYXYuc2VjdGlvbnMuRE9PRExFU1xuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIuaW4gW0AkY2xvc2VCdG4sIEAkaW5mb0J0bl0sIGNvbG91clxuXHRcdFx0Q29kZVdvcmRUcmFuc2l0aW9uZXIub3V0IFtAJG5hdkxpbmtBYm91dCwgQCRuYXZMaW5rQ29udHJpYnV0ZV0sIGNvbG91clxuXHRcdGVsc2Vcblx0XHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIFtAJGNsb3NlQnRuXSwgY29sb3VyXG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5vdXQgW0AkbmF2TGlua0Fib3V0LCBAJG5hdkxpbmtDb250cmlidXRlLCBAJGluZm9CdG5dLCBjb2xvdXJcblxuXHRcdG51bGxcblxuXHRnZXRTZWN0aW9uQ29sb3VyIDogKHNlY3Rpb24pID0+XG5cblx0XHRzZWN0aW9uID0gc2VjdGlvbiBvciBAQ0QoKS5uYXYuY3VycmVudC5hcmVhIG9yICdob21lJ1xuXG5cdFx0Y29sb3VyICA9IHN3aXRjaCBzZWN0aW9uXG5cdFx0XHR3aGVuICdob21lJyB0aGVuICdyZWQnXG5cdFx0XHRlbHNlICdibHVlJ1xuXG5cdFx0Y29sb3VyXG5cblx0YW5pbWF0ZVRleHRJbiA6ID0+XG5cblx0XHRAb25BcmVhQ2hhbmdlIEBDRCgpLm5hdi5jdXJyZW50LmFyZWFcblxuXHRcdG51bGxcblxuXHRvbldvcmRFbnRlciA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSAkZWwsIEBnZXRTZWN0aW9uQ29sb3VyKClcblxuXHRcdG51bGxcblxuXHRvbldvcmRMZWF2ZSA6IChlKSA9PlxuXG5cdFx0JGVsID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cblx0XHRDb2RlV29yZFRyYW5zaXRpb25lci51bnNjcmFtYmxlICRlbCwgQGdldFNlY3Rpb25Db2xvdXIoKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWRlclxuIiwiQWJzdHJhY3RWaWV3ICAgICAgICAgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5Db2RlV29yZFRyYW5zaXRpb25lciA9IHJlcXVpcmUgJy4uLy4uL3V0aWxzL0NvZGVXb3JkVHJhbnNpdGlvbmVyJ1xuXG5jbGFzcyBQcmVsb2FkZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblx0XG5cdGNiICAgICAgICAgICAgICA6IG51bGxcblx0XG5cdFRSQU5TSVRJT05fVElNRSA6IDAuNVxuXG5cdE1JTl9XUk9OR19DSEFSUyA6IDBcblx0TUFYX1dST05HX0NIQVJTIDogNFxuXG5cdE1JTl9DSEFSX0lOX0RFTEFZIDogMzBcblx0TUFYX0NIQVJfSU5fREVMQVkgOiAxMDBcblxuXHRNSU5fQ0hBUl9PVVRfREVMQVkgOiAzMFxuXHRNQVhfQ0hBUl9PVVRfREVMQVkgOiAxMDBcblxuXHRDSEFSUyA6ICdhYmNkZWZoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSE/KigpQMKjJCVeJl8tKz1bXXt9OjtcXCdcIlxcXFx8PD4sLi9+YCcuc3BsaXQoJycpXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QCRjb2RlV29yZCA9IEAkZWwuZmluZCgnW2RhdGEtY29kZXdvcmRdJylcblxuXHRcdG51bGxcblxuXHRzaG93IDogKEBjYikgPT5cblxuXHRcdGNvbnNvbGUubG9nIFwic2hvdyA6IChAY2IpID0+XCJcblxuXHRcdCMgREVCVUchXG5cdFx0IyByZXR1cm4gQGNiKClcblxuXHRcdEAkZWwuYWRkQ2xhc3MoJ3Nob3ctcHJlbG9hZGVyJylcblxuXHRcdENvZGVXb3JkVHJhbnNpdGlvbmVyLmluIEAkY29kZVdvcmQsICd3aGl0ZScsIGZhbHNlLCBAaGlkZVxuXG5cdFx0bnVsbFxuXG5cdG9uU2hvd0NvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiA9PlxuXG5cdFx0QGFuaW1hdGVPdXQgQG9uSGlkZUNvbXBsZXRlXG5cblx0XHRudWxsXG5cblx0b25IaWRlQ29tcGxldGUgOiA9PlxuXG5cdFx0QCRlbC5yZW1vdmVDbGFzcygnc2hvdy1wcmVsb2FkZXInKVxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGFuaW1hdGVPdXQgOiAoY2IpID0+XG5cblx0XHQjIEBhbmltYXRlQ2hhcnNPdXQoKVxuXG5cdFx0IyB0aGF0J2xsIGRvXG5cdFx0IyBzZXRUaW1lb3V0IGNiLCAyMjAwXG5cblx0XHRzZXRUaW1lb3V0ID0+XG5cdFx0XHRDb2RlV29yZFRyYW5zaXRpb25lci5zY3JhbWJsZSBAJGNvZGVXb3JkLCAnd2hpdGUnLCBmYWxzZSwgY2Jcblx0XHQsIDIwMDBcblxuXHRcdG51bGxcblxuXHRhbmltYXRlQ2hhcnNPdXQgOiA9PlxuXG5cdFx0QCRjb2RlV29yZC5maW5kKCdbZGF0YS1jb2RldGV4dC1jaGFyXScpLmVhY2ggKGksIGVsKSA9PlxuXG5cdFx0XHQkZWwgPSAkKGVsKVxuXG5cdFx0XHQkZWwuYWRkQ2xhc3MoJ2hpZGUtYm9yZGVyJylcblxuXHRcdFx0ZGVsYXkgICAgICAgID0gMSArIChfLnJhbmRvbSg1MCwgMjAwKSAvIDEwMDApXG5cdFx0XHRkaXNwbGFjZW1lbnQgPSBfLnJhbmRvbSgyMCwgMzApXG5cdFx0XHRyb3RhdGlvbiAgICAgPSAoZGlzcGxhY2VtZW50IC8gMzApICogNTBcblx0XHRcdHJvdGF0aW9uICAgICA9IGlmIChNYXRoLnJhbmRvbSgpID4gMC41KSB0aGVuIHJvdGF0aW9uIGVsc2UgLXJvdGF0aW9uXG5cblx0XHRcdFR3ZWVuTGl0ZS50byAkZWwsIDEsIHsgZGVsYXkgOiBkZWxheSwgb3BhY2l0eSA6IDAsIHkgOiBkaXNwbGFjZW1lbnQsIHJvdGF0aW9uIDogXCIje3JvdGF0aW9ufWRlZ1wiLCBlYXNlIDogQ3ViaWMuZWFzZUluIH1cblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVsb2FkZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICAgICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5BYm91dFBhZ2VWaWV3ICAgICAgPSByZXF1aXJlICcuLi9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldydcbkNvbnRyaWJ1dGVQYWdlVmlldyA9IHJlcXVpcmUgJy4uL2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldydcbkRvb2RsZVBhZ2VWaWV3ICAgICA9IHJlcXVpcmUgJy4uL2Rvb2RsZVBhZ2UvRG9vZGxlUGFnZVZpZXcnXG5OYXYgICAgICAgICAgICAgICAgPSByZXF1aXJlICcuLi8uLi9yb3V0ZXIvTmF2J1xuXG5jbGFzcyBXcmFwcGVyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0VklFV19UWVBFX1BBR0UgIDogJ3BhZ2UnXG5cdFZJRVdfVFlQRV9NT0RBTCA6ICdtb2RhbCdcblxuXHR0ZW1wbGF0ZSA6ICd3cmFwcGVyJ1xuXG5cdHZpZXdzICAgICAgICAgIDogbnVsbFxuXHRwcmV2aW91c1ZpZXcgICA6IG51bGxcblx0Y3VycmVudFZpZXcgICAgOiBudWxsXG5cdGJhY2tncm91bmRWaWV3IDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB2aWV3cyA9XG5cdFx0XHRob21lICAgICAgIDogY2xhc3NSZWYgOiBIb21lVmlldywgICAgICAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkhPTUUsICAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRhYm91dCAgICAgIDogY2xhc3NSZWYgOiBBYm91dFBhZ2VWaWV3LCAgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkFCT1VULCAgICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRjb250cmlidXRlIDogY2xhc3NSZWYgOiBDb250cmlidXRlUGFnZVZpZXcsIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEUsIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRkb29kbGUgICAgIDogY2xhc3NSZWYgOiBEb29kbGVQYWdlVmlldywgICAgIHJvdXRlIDogQENEKCkubmF2LnNlY3Rpb25zLkRPT0RMRVMsICAgIHZpZXcgOiBudWxsLCB0eXBlIDogQFZJRVdfVFlQRV9QQUdFXG5cblx0XHRAY3JlYXRlQ2xhc3NlcygpXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIGRlY2lkZSBpZiB5b3Ugd2FudCB0byBhZGQgYWxsIGNvcmUgRE9NIHVwIGZyb250LCBvciBhZGQgb25seSB3aGVuIHJlcXVpcmVkLCBzZWUgY29tbWVudHMgaW4gQWJzdHJhY3RWaWV3UGFnZS5jb2ZmZWVcblx0XHQjIEBhZGRDbGFzc2VzKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0Y3JlYXRlQ2xhc3NlcyA6ID0+XG5cblx0XHQoQHZpZXdzW25hbWVdLnZpZXcgPSBuZXcgQHZpZXdzW25hbWVdLmNsYXNzUmVmKSBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3NcblxuXHRcdG51bGxcblxuXHRhZGRDbGFzc2VzIDogPT5cblxuXHRcdCBmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHQgXHRpZiBkYXRhLnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIHRoZW4gQGFkZENoaWxkIGRhdGEudmlld1xuXG5cdFx0bnVsbFxuXG5cdGdldFZpZXdCeVJvdXRlIDogKHJvdXRlKSA9PlxuXG5cdFx0Zm9yIG5hbWUsIGRhdGEgb2YgQHZpZXdzXG5cdFx0XHRyZXR1cm4gQHZpZXdzW25hbWVdIGlmIHJvdXRlIGlzIEB2aWV3c1tuYW1lXS5yb3V0ZVxuXG5cdFx0bnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0QENEKCkuYXBwVmlldy5vbiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdG51bGxcblxuXHRzdGFydCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9mZiAnc3RhcnQnLCBAc3RhcnRcblxuXHRcdEBiaW5kRXZlbnRzKClcblxuXHRcdG51bGxcblxuXHRiaW5kRXZlbnRzIDogPT5cblxuXHRcdEBDRCgpLm5hdi5vbiBOYXYuRVZFTlRfQ0hBTkdFX1ZJRVcsIEBjaGFuZ2VWaWV3XG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjaGFuZ2VTdWJWaWV3XG5cblx0XHRudWxsXG5cblx0IyMjXG5cblx0VEhJUyBJUyBBIE1FU1MsIFNPUlQgSVQgKG5laWwpXG5cblx0IyMjXG5cdGNoYW5nZVZpZXcgOiAocHJldmlvdXMsIGN1cnJlbnQpID0+XG5cblx0XHRAcHJldmlvdXNWaWV3ID0gQGdldFZpZXdCeVJvdXRlIHByZXZpb3VzLmFyZWFcblx0XHRAY3VycmVudFZpZXcgID0gQGdldFZpZXdCeVJvdXRlIGN1cnJlbnQuYXJlYVxuXG5cdFx0aWYgIUBwcmV2aW91c1ZpZXdcblxuXHRcdFx0aWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgZmFsc2UsIEBjdXJyZW50Vmlldy52aWV3XG5cdFx0XHRlbHNlIGlmIEBjdXJyZW50Vmlldy50eXBlIGlzIEBWSUVXX1RZUEVfTU9EQUxcblx0XHRcdFx0QGJhY2tncm91bmRWaWV3ID0gQHZpZXdzLmhvbWVcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3LnZpZXcsIHRydWVcblxuXHRcdGVsc2VcblxuXHRcdFx0aWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldy52aWV3LCBAY3VycmVudFZpZXcudmlld1xuXHRcdFx0ZWxzZSBpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX01PREFMIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFXG5cdFx0XHRcdEBiYWNrZ3JvdW5kVmlldyA9IEBwcmV2aW91c1ZpZXdcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3LnZpZXcsIHRydWVcblx0XHRcdGVsc2UgaWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9QQUdFIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTFxuXHRcdFx0XHRAYmFja2dyb3VuZFZpZXcgPSBAYmFja2dyb3VuZFZpZXcgb3IgQHZpZXdzLmhvbWVcblx0XHRcdFx0aWYgQGJhY2tncm91bmRWaWV3IGlzbnQgQGN1cnJlbnRWaWV3XG5cdFx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LnZpZXcsIEBjdXJyZW50Vmlldy52aWV3LCBmYWxzZSwgdHJ1ZVxuXHRcdFx0XHRlbHNlIGlmIEBiYWNrZ3JvdW5kVmlldyBpcyBAY3VycmVudFZpZXdcblx0XHRcdFx0XHRAdHJhbnNpdGlvblZpZXdzIEBwcmV2aW91c1ZpZXcudmlldywgZmFsc2Vcblx0XHRcdGVsc2UgaWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTCBhbmQgQHByZXZpb3VzVmlldy50eXBlIGlzIEBWSUVXX1RZUEVfTU9EQUxcblx0XHRcdFx0QGJhY2tncm91bmRWaWV3ID0gQGJhY2tncm91bmRWaWV3IG9yIEB2aWV3cy5ob21lXG5cdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldy52aWV3LCBAY3VycmVudFZpZXcudmlldywgdHJ1ZVxuXG5cdFx0bnVsbFxuXG5cdGNoYW5nZVN1YlZpZXcgOiAoY3VycmVudCkgPT5cblxuXHRcdEBjdXJyZW50Vmlldy52aWV3LnRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgY3VycmVudC5zdWJcblxuXHRcdG51bGxcblxuXHR0cmFuc2l0aW9uVmlld3MgOiAoZnJvbSwgdG8sIHRvTW9kYWw9ZmFsc2UsIGZyb21Nb2RhbD1mYWxzZSkgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgZnJvbSBpc250IHRvXG5cblx0XHRpZiB0b01vZGFsIHRoZW4gQGJhY2tncm91bmRWaWV3LnZpZXc/LnNob3coKVxuXHRcdGlmIGZyb21Nb2RhbCB0aGVuIEBiYWNrZ3JvdW5kVmlldy52aWV3Py5oaWRlKClcblxuXHRcdGlmIGZyb20gYW5kIHRvXG5cdFx0XHRmcm9tLmhpZGUgdG8uc2hvd1xuXHRcdGVsc2UgaWYgZnJvbVxuXHRcdFx0ZnJvbS5oaWRlKClcblx0XHRlbHNlIGlmIHRvXG5cdFx0XHR0by5zaG93KClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBXcmFwcGVyXG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgQ29udHJpYnV0ZVBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtY29udHJpYnV0ZSdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImNvbnRyaWJ1dGVfZGVzY1wiXG5cblx0XHQjIyNcblxuXHRcdGluc3RhbnRpYXRlIGNsYXNzZXMgaGVyZVxuXG5cdFx0QGV4YW1wbGVDbGFzcyA9IG5ldyBleGFtcGxlQ2xhc3NcblxuXHRcdCMjI1xuXG5cdFx0c3VwZXIoKVxuXG5cdFx0IyMjXG5cblx0XHRhZGQgY2xhc3NlcyB0byBhcHAgc3RydWN0dXJlIGhlcmVcblxuXHRcdEBcblx0XHRcdC5hZGRDaGlsZChAZXhhbXBsZUNsYXNzKVxuXG5cdFx0IyMjXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyaWJ1dGVQYWdlVmlld1xuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIERvb2RsZVBhZ2VWaWV3IGV4dGVuZHMgQWJzdHJhY3RWaWV3UGFnZVxuXG5cdHRlbXBsYXRlIDogJ3BhZ2UtZG9vZGxlJ1xuXHRtb2RlbCAgICA6IG51bGxcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImRvb2RsZV9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IGV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cblx0c2hvdyA6ID0+XG5cblx0XHRAbW9kZWwgPSBAZ2V0RG9vZGxlKClcblxuXHRcdHN1cGVyXG5cblx0XHRudWxsXG5cblx0Z2V0RG9vZGxlIDogPT5cblxuXHRcdGRvb2RsZSA9IEBDRCgpLmFwcERhdGEuZG9vZGxlcy5nZXREb29kbGVCeVNsdWcgQENEKCkubmF2LmN1cnJlbnQuc3ViKycvJytAQ0QoKS5uYXYuY3VycmVudC50ZXJcblxuXHRcdGRvb2RsZVxuXG5tb2R1bGUuZXhwb3J0cyA9IERvb2RsZVBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1ob21lJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiaG9tZV9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IEV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cblx0c2hvdyA6ID0+XG5cblx0XHRzdXBlclxuXG5cdFx0aHRtbCA9IFwiPHVsPlwiXG5cblx0XHRmb3IgZG9vZGxlIGluIEBDRCgpLmFwcERhdGEuZG9vZGxlcy5tb2RlbHNcblxuXHRcdFx0aHRtbCArPSBcIjxsaT48YSBocmVmPVxcXCIje0BDRCgpLkJBU0VfVVJMfS8je0BDRCgpLm5hdi5zZWN0aW9ucy5ET09ETEVTfS8je2Rvb2RsZS5nZXQoJ3NsdWcnKX1cXFwiPiN7ZG9vZGxlLmdldCgnYXV0aG9yLm5hbWUnKX0gLSAje2Rvb2RsZS5nZXQoJ25hbWUnKX08L2E+PC9saT5cIlxuXG5cdFx0aHRtbCArPSAnPC91bD4nXG5cblx0XHRAJGVsLmZpbmQoJy5ob21lLWdyaWQnKS5odG1sKGh0bWwpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RNb2RhbCBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCR3aW5kb3cgOiBudWxsXG5cblx0IyMjIG92ZXJyaWRlIGluIGluZGl2aWR1YWwgY2xhc3NlcyAjIyNcblx0bmFtZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEAkd2luZG93ID0gJCh3aW5kb3cpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAQ0QoKS5hcHBWaWV3LmFkZENoaWxkIEBcblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblx0XHRAYW5pbWF0ZUluKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PiBAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAc2V0TGlzdGVuZXJzICdvZmYnXG5cdFx0QENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIubW9kYWxzW0BuYW1lXS52aWV3ID0gbnVsbFxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCR3aW5kb3dbc2V0dGluZ10gJ2tleXVwJywgQG9uS2V5VXBcblx0XHRAJCgnW2RhdGEtY2xvc2VdJylbc2V0dGluZ10gJ2NsaWNrJywgQGNsb3NlQ2xpY2tcblxuXHRcdG51bGxcblxuXHRvbktleVVwIDogKGUpID0+XG5cblx0XHRpZiBlLmtleUNvZGUgaXMgMjcgdGhlbiBAaGlkZSgpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IFF1YWQuZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyBkZWxheSA6IDAuMTUsICd0cmFuc2Zvcm0nOiAnc2NhbGUoMSknLCAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogQmFjay5lYXNlT3V0IH1cblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNhbGxiYWNrKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyBkZWxheSA6IDAuMTUsICdvcGFjaXR5JzogMCwgZWFzZSA6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogY2FsbGJhY2sgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgJ3RyYW5zZm9ybSc6ICdzY2FsZSgwLjgpJywgJ29wYWNpdHknOiAwLCBlYXNlIDogQmFjay5lYXNlSW4gfVxuXG5cdFx0bnVsbFxuXG5cdGNsb3NlQ2xpY2s6ICggZSApID0+XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KClcblxuXHRcdEBoaWRlKClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdE1vZGFsXG4iLCJBYnN0cmFjdE1vZGFsID0gcmVxdWlyZSAnLi9BYnN0cmFjdE1vZGFsJ1xuXG5jbGFzcyBPcmllbnRhdGlvbk1vZGFsIGV4dGVuZHMgQWJzdHJhY3RNb2RhbFxuXG5cdG5hbWUgICAgIDogJ29yaWVudGF0aW9uTW9kYWwnXG5cdHRlbXBsYXRlIDogJ29yaWVudGF0aW9uLW1vZGFsJ1xuXG5cdGNiICAgICAgIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogKEBjYikgLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSB7QG5hbWV9XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoc3RpbGxMYW5kc2NhcGU9dHJ1ZSkgPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+XG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cdFx0XHRpZiAhc3RpbGxMYW5kc2NhcGUgdGhlbiBAY2I/KClcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHN1cGVyXG5cblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddICd1cGRhdGVEaW1zJywgQG9uVXBkYXRlRGltc1xuXHRcdEAkZWxbc2V0dGluZ10gJ3RvdWNoZW5kIGNsaWNrJywgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblVwZGF0ZURpbXMgOiAoZGltcykgPT5cblxuXHRcdGlmIGRpbXMubyBpcyAncG9ydHJhaXQnIHRoZW4gQGhpZGUgZmFsc2VcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBPcmllbnRhdGlvbk1vZGFsXG4iLCJBYnN0cmFjdFZpZXcgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuT3JpZW50YXRpb25Nb2RhbCA9IHJlcXVpcmUgJy4vT3JpZW50YXRpb25Nb2RhbCdcblxuY2xhc3MgTW9kYWxNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0IyB3aGVuIG5ldyBtb2RhbCBjbGFzc2VzIGFyZSBjcmVhdGVkLCBhZGQgaGVyZSwgd2l0aCByZWZlcmVuY2UgdG8gY2xhc3MgbmFtZVxuXHRtb2RhbHMgOlxuXHRcdG9yaWVudGF0aW9uTW9kYWwgOiBjbGFzc1JlZiA6IE9yaWVudGF0aW9uTW9kYWwsIHZpZXcgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRpc09wZW4gOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiByZXR1cm4gdHJ1ZSApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRmYWxzZVxuXG5cdGhpZGVPcGVuTW9kYWwgOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiBvcGVuTW9kYWwgPSBAbW9kYWxzW25hbWVdLnZpZXcgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0b3Blbk1vZGFsPy5oaWRlKClcblxuXHRcdG51bGxcblxuXHRzaG93TW9kYWwgOiAobmFtZSwgY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiBpZiBAbW9kYWxzW25hbWVdLnZpZXdcblxuXHRcdEBtb2RhbHNbbmFtZV0udmlldyA9IG5ldyBAbW9kYWxzW25hbWVdLmNsYXNzUmVmIGNiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxNYW5hZ2VyXG4iXX0=
