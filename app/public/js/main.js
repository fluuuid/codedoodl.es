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

  App.prototype.BASE_PATH = window.config.hostname;

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



},{"./AppData":3,"./AppView":4,"./data/Locale":8,"./data/Templates":9,"./router/Nav":13,"./router/Router":14,"./utils/Analytics":15,"./utils/AuthManager":16,"./utils/Facebook":17,"./utils/GooglePlus":18,"./utils/MediaQueries":19,"./utils/Share":21}],3:[function(require,module,exports){
var API, AbstractData, AppData, Requester,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractData = require('./data/AbstractData');

Requester = require('./utils/Requester');

API = require('./data/API');

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
    this.getStartData();
    return null;
  }


  /*
  get app bootstrap data - embed in HTML or API endpoint
   */

  AppData.prototype.getStartData = function() {
    var r;
    if (API.get('start')) {
      r = Requester.request({
        url: API.get('start'),
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



},{"./data/API":6,"./data/AbstractData":7,"./utils/Requester":20}],4:[function(require,module,exports){
var AbstractView, AppView, Footer, Header, MediaQueries, ModalManager, Preloader, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('./view/AbstractView');

Preloader = require('./view/base/Preloader');

Header = require('./view/base/Header');

Wrapper = require('./view/base/Wrapper');

Footer = require('./view/base/Footer');

ModalManager = require('./view/modals/_ModalManager');

MediaQueries = require('./utils/MediaQueries');

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
    this.updateMediaQueriesLog = __bind(this.updateMediaQueriesLog, this);
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
    this.preloader.hide();
    this.updateMediaQueriesLog();
  };

  AppView.prototype.onResize = function() {
    this.getDims();
    this.updateMediaQueriesLog();
  };

  AppView.prototype.updateMediaQueriesLog = function() {
    if (this.header) {
      this.header.$el.find(".breakpoint").html("<div class='l'>CURRENT BREAKPOINT:</div><div class='b'>" + (MediaQueries.getBreakpoint()) + "</div>");
    }
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
    route = href.match(this.CD().BASE_PATH) ? href.split(this.CD().BASE_PATH)[1] : href;
    section = route.indexOf('/') === 0 ? route.split('/')[1] : route;
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

    /*
    
    bind tracking events if necessary
     */
  };

  return AppView;

})(AbstractView);

module.exports = AppView;



},{"./utils/MediaQueries":19,"./view/AbstractView":22,"./view/base/Footer":25,"./view/base/Header":26,"./view/base/Preloader":27,"./view/base/Wrapper":28,"./view/modals/_ModalManager":33}],5:[function(require,module,exports){
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



},{"../../models/core/TemplateModel":12}],6:[function(require,module,exports){
var API, APIRouteModel;

APIRouteModel = require('../models/core/APIRouteModel');

API = (function() {
  function API() {}

  API.model = new APIRouteModel;

  API.getContants = function() {
    return {

      /* add more if we wanna use in API strings */
      BASE_PATH: API.CD().BASE_PATH
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



},{"../models/core/APIRouteModel":10}],7:[function(require,module,exports){
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



},{}],8:[function(require,module,exports){
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



},{"../data/API":6,"../models/core/LocalesModel":11}],9:[function(require,module,exports){
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



},{"../collections/core/TemplatesCollection":5,"../models/core/TemplateModel":12}],10:[function(require,module,exports){
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
      login: "{{ BASE_PATH }}/api/user/login",
      register: "{{ BASE_PATH }}/api/user/register",
      password: "{{ BASE_PATH }}/api/user/password",
      update: "{{ BASE_PATH }}/api/user/update",
      logout: "{{ BASE_PATH }}/api/user/logout",
      remove: "{{ BASE_PATH }}/api/user/remove"
    }
  };

  return APIRouteModel;

})(Backbone.DeepModel);

module.exports = APIRouteModel;



},{}],11:[function(require,module,exports){
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



},{}],12:[function(require,module,exports){
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



},{}],13:[function(require,module,exports){
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

  Nav.prototype.sections = {
    HOME: '',
    ABOUT: 'about',
    CONTRIBUTE: 'contribute'
  };

  Nav.prototype.current = {
    area: null,
    sub: null
  };

  Nav.prototype.previous = {
    area: null,
    sub: null
  };

  function Nav() {
    this.setPageTitle = __bind(this.setPageTitle, this);
    this.changeView = __bind(this.changeView, this);
    this.getSection = __bind(this.getSection, this);
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

  Nav.prototype.changeView = function(area, sub, params) {
    this.previous = this.current;
    this.current = {
      area: area,
      sub: sub
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
    this.setPageTitle(area, sub);
    return null;
  };

  Nav.prototype.setPageTitle = function(area, sub) {
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



},{"../view/AbstractView":22,"./Router":14}],14:[function(require,module,exports){
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
    '(/)(:area)(/:sub)(/)': 'hashChanged',
    '*actions': 'navigateTo'
  };

  Router.prototype.area = null;

  Router.prototype.sub = null;

  Router.prototype.params = null;

  Router.prototype.start = function() {
    Backbone.history.start({
      pushState: true,
      root: '/'
    });
    return null;
  };

  Router.prototype.hashChanged = function(area, sub) {
    this.area = area != null ? area : null;
    this.sub = sub != null ? sub : null;
    console.log(">> EVENT_HASH_CHANGED @area = " + this.area + ", @sub = " + this.sub + " <<");
    if (this.FIRST_ROUTE) {
      this.FIRST_ROUTE = false;
    }
    if (!this.area) {
      this.area = this.CD().nav.sections.HOME;
    }
    this.trigger(Router.EVENT_HASH_CHANGED, this.area, this.sub, this.params);
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



},{}],15:[function(require,module,exports){

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



},{}],16:[function(require,module,exports){
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



},{"../data/AbstractData":7,"../utils/Facebook":17,"../utils/GooglePlus":18}],17:[function(require,module,exports){
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



},{"../data/AbstractData":7}],18:[function(require,module,exports){
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



},{"../data/AbstractData":7}],19:[function(require,module,exports){
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



},{}],20:[function(require,module,exports){

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



},{}],21:[function(require,module,exports){

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
    this.url = this.CD().BASE_PATH;
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



},{}],22:[function(require,module,exports){
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



},{}],23:[function(require,module,exports){
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



},{"./AbstractView":22}],24:[function(require,module,exports){
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



},{"../AbstractViewPage":23}],25:[function(require,module,exports){
var AbstractView, Footer,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Footer = (function(_super) {
  __extends(Footer, _super);

  Footer.prototype.template = 'site-footer';

  function Footer() {
    this.templateVars = {
      desc: this.CD().locale.get("footer_desc")
    };
    Footer.__super__.constructor.call(this);
    return null;
  }

  return Footer;

})(AbstractView);

module.exports = Footer;



},{"../AbstractView":22}],26:[function(require,module,exports){
var AbstractView, Header,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Header = (function(_super) {
  __extends(Header, _super);

  Header.prototype.template = 'site-header';

  function Header() {
    this.templateVars = {
      desc: this.CD().locale.get("header_desc"),
      home: {
        label: 'Go to homepage',
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.HOME
      },
      about: {
        label: 'Go to about page',
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.ABOUT
      },
      contribute: {
        label: 'Go to contribute page',
        url: this.CD().BASE_PATH + '/' + this.CD().nav.sections.CONTRIBUTE
      }
    };
    Header.__super__.constructor.call(this);
    return null;
  }

  return Header;

})(AbstractView);

module.exports = Header;



},{"../AbstractView":22}],27:[function(require,module,exports){
var AbstractView, Preloader,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

Preloader = (function(_super) {
  __extends(Preloader, _super);

  Preloader.prototype.cb = null;

  Preloader.prototype.TRANSITION_TIME = 0.5;

  function Preloader() {
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
    return null;
  };

  Preloader.prototype.show = function(cb) {
    this.cb = cb;
    this.$el.css({
      'display': 'block'
    });
    return null;
  };

  Preloader.prototype.onShowComplete = function() {
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  Preloader.prototype.hide = function(cb) {
    this.cb = cb;
    this.onHideComplete();
    return null;
  };

  Preloader.prototype.onHideComplete = function() {
    this.$el.css({
      'display': 'none'
    });
    if (typeof this.cb === "function") {
      this.cb();
    }
    return null;
  };

  return Preloader;

})(AbstractView);

module.exports = Preloader;



},{"../AbstractView":22}],28:[function(require,module,exports){
var AboutPageView, AbstractView, ContributePageView, HomeView, Nav, Wrapper,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractView = require('../AbstractView');

HomeView = require('../home/HomeView');

AboutPageView = require('../aboutPage/AboutPageView');

ContributePageView = require('../contributePage/ContributePageView');

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



},{"../../router/Nav":13,"../AbstractView":22,"../aboutPage/AboutPageView":24,"../contributePage/ContributePageView":29,"../home/HomeView":30}],29:[function(require,module,exports){
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



},{"../AbstractViewPage":23}],30:[function(require,module,exports){
var AbstractViewPage, HomeView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AbstractViewPage = require('../AbstractViewPage');

HomeView = (function(_super) {
  __extends(HomeView, _super);

  HomeView.prototype.template = 'page-home';

  function HomeView() {
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

  return HomeView;

})(AbstractViewPage);

module.exports = HomeView;



},{"../AbstractViewPage":23}],31:[function(require,module,exports){
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



},{"../AbstractView":22}],32:[function(require,module,exports){
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



},{"./AbstractModal":31}],33:[function(require,module,exports){
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



},{"../AbstractView":22,"./OrientationModal":32}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvTWFpbi5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvQXBwLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBEYXRhLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9BcHBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24uY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvQVBJLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9kYXRhL0Fic3RyYWN0RGF0YS5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvZGF0YS9Mb2NhbGUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL2RhdGEvVGVtcGxhdGVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9BUElSb3V0ZU1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL21vZGVscy9jb3JlL1RlbXBsYXRlTW9kZWwuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9OYXYuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3JvdXRlci9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0FuYWx5dGljcy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvQXV0aE1hbmFnZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL0ZhY2Vib29rLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9Hb29nbGVQbHVzLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS91dGlscy9NZWRpYVF1ZXJpZXMuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3V0aWxzL1JlcXVlc3Rlci5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdXRpbHMvU2hhcmUuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvQWJzdHJhY3RWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L0Fic3RyYWN0Vmlld1BhZ2UuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYWJvdXRQYWdlL0Fib3V0UGFnZVZpZXcuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9Gb290ZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9IZWFkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9QcmVsb2FkZXIuY29mZmVlIiwiL1VzZXJzL25laWxjYXJwZW50ZXIvU2l0ZXMvY29kZWRvb2RsLmVzL3Byb2plY3QvY29mZmVlL3ZpZXcvYmFzZS9XcmFwcGVyLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldy5jb2ZmZWUiLCIvVXNlcnMvbmVpbGNhcnBlbnRlci9TaXRlcy9jb2RlZG9vZGwuZXMvcHJvamVjdC9jb2ZmZWUvdmlldy9ob21lL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9BYnN0cmFjdE1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9PcmllbnRhdGlvbk1vZGFsLmNvZmZlZSIsIi9Vc2Vycy9uZWlsY2FycGVudGVyL1NpdGVzL2NvZGVkb29kbC5lcy9wcm9qZWN0L2NvZmZlZS92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUEsa0JBQUE7O0FBQUEsR0FBQSxHQUFNLE9BQUEsQ0FBUSxPQUFSLENBQU4sQ0FBQTs7QUFLQTtBQUFBOzs7R0FMQTs7QUFBQSxPQVdBLEdBQVUsS0FYVixDQUFBOztBQUFBLElBY0EsR0FBVSxPQUFILEdBQWdCLEVBQWhCLEdBQXlCLE1BQUEsSUFBVSxRQWQxQyxDQUFBOztBQUFBLElBaUJJLENBQUMsRUFBTCxHQUFjLElBQUEsR0FBQSxDQUFJLE9BQUosQ0FqQmQsQ0FBQTs7QUFBQSxJQWtCSSxDQUFDLEVBQUUsQ0FBQyxJQUFSLENBQUEsQ0FsQkEsQ0FBQTs7Ozs7QUNBQSxJQUFBLHdIQUFBO0VBQUEsa0ZBQUE7O0FBQUEsU0FBQSxHQUFlLE9BQUEsQ0FBUSxtQkFBUixDQUFmLENBQUE7O0FBQUEsV0FDQSxHQUFlLE9BQUEsQ0FBUSxxQkFBUixDQURmLENBQUE7O0FBQUEsS0FFQSxHQUFlLE9BQUEsQ0FBUSxlQUFSLENBRmYsQ0FBQTs7QUFBQSxRQUdBLEdBQWUsT0FBQSxDQUFRLGtCQUFSLENBSGYsQ0FBQTs7QUFBQSxVQUlBLEdBQWUsT0FBQSxDQUFRLG9CQUFSLENBSmYsQ0FBQTs7QUFBQSxTQUtBLEdBQWUsT0FBQSxDQUFRLGtCQUFSLENBTGYsQ0FBQTs7QUFBQSxNQU1BLEdBQWUsT0FBQSxDQUFRLGVBQVIsQ0FOZixDQUFBOztBQUFBLE1BT0EsR0FBZSxPQUFBLENBQVEsaUJBQVIsQ0FQZixDQUFBOztBQUFBLEdBUUEsR0FBZSxPQUFBLENBQVEsY0FBUixDQVJmLENBQUE7O0FBQUEsT0FTQSxHQUFlLE9BQUEsQ0FBUSxXQUFSLENBVGYsQ0FBQTs7QUFBQSxPQVVBLEdBQWUsT0FBQSxDQUFRLFdBQVIsQ0FWZixDQUFBOztBQUFB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b250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwID0gcmVxdWlyZSAnLi9BcHAnXG5cbiMgUFJPRFVDVElPTiBFTlZJUk9OTUVOVCAtIG1heSB3YW50IHRvIHVzZSBzZXJ2ZXItc2V0IHZhcmlhYmxlcyBoZXJlXG4jIElTX0xJVkUgPSBkbyAtPiByZXR1cm4gaWYgd2luZG93LmxvY2F0aW9uLmhvc3QuaW5kZXhPZignbG9jYWxob3N0JykgPiAtMSBvciB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGlzICc/ZCcgdGhlbiBmYWxzZSBlbHNlIHRydWVcblxuIyMjXG5cbldJUCAtIHRoaXMgd2lsbCBpZGVhbGx5IGNoYW5nZSB0byBvbGQgZm9ybWF0IChhYm92ZSkgd2hlbiBjYW4gZmlndXJlIGl0IG91dFxuXG4jIyNcblxuSVNfTElWRSA9IGZhbHNlXG5cbiMgT05MWSBFWFBPU0UgQVBQIEdMT0JBTExZIElGIExPQ0FMIE9SIERFVidJTkdcbnZpZXcgPSBpZiBJU19MSVZFIHRoZW4ge30gZWxzZSAod2luZG93IG9yIGRvY3VtZW50KVxuXG4jIERFQ0xBUkUgTUFJTiBBUFBMSUNBVElPTlxudmlldy5DRCA9IG5ldyBBcHAgSVNfTElWRVxudmlldy5DRC5pbml0KClcbiIsIkFuYWx5dGljcyAgICA9IHJlcXVpcmUgJy4vdXRpbHMvQW5hbHl0aWNzJ1xuQXV0aE1hbmFnZXIgID0gcmVxdWlyZSAnLi91dGlscy9BdXRoTWFuYWdlcidcblNoYXJlICAgICAgICA9IHJlcXVpcmUgJy4vdXRpbHMvU2hhcmUnXG5GYWNlYm9vayAgICAgPSByZXF1aXJlICcuL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi91dGlscy9Hb29nbGVQbHVzJ1xuVGVtcGxhdGVzICAgID0gcmVxdWlyZSAnLi9kYXRhL1RlbXBsYXRlcydcbkxvY2FsZSAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9Mb2NhbGUnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9Sb3V0ZXInXG5OYXYgICAgICAgICAgPSByZXF1aXJlICcuL3JvdXRlci9OYXYnXG5BcHBEYXRhICAgICAgPSByZXF1aXJlICcuL0FwcERhdGEnXG5BcHBWaWV3ICAgICAgPSByZXF1aXJlICcuL0FwcFZpZXcnXG5NZWRpYVF1ZXJpZXMgPSByZXF1aXJlICcuL3V0aWxzL01lZGlhUXVlcmllcydcblxuY2xhc3MgQXBwXG5cbiAgICBMSVZFICAgICAgIDogbnVsbFxuICAgIEJBU0VfUEFUSCAgOiB3aW5kb3cuY29uZmlnLmhvc3RuYW1lXG4gICAgbG9jYWxlQ29kZSA6IHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuICAgIG9ialJlYWR5ICAgOiAwXG5cbiAgICBfdG9DbGVhbiAgIDogWydvYmpSZWFkeScsICdzZXRGbGFncycsICdvYmplY3RDb21wbGV0ZScsICdpbml0JywgJ2luaXRPYmplY3RzJywgJ2luaXRTREtzJywgJ2luaXRBcHAnLCAnZ28nLCAnY2xlYW51cCcsICdfdG9DbGVhbiddXG5cbiAgICBjb25zdHJ1Y3RvciA6IChATElWRSkgLT5cblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgc2V0RmxhZ3MgOiA9PlxuXG4gICAgICAgIHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5zZXR1cCgpO1xuXG4gICAgICAgIEBJU19BTkRST0lEICAgID0gdWEuaW5kZXhPZignYW5kcm9pZCcpID4gLTFcbiAgICAgICAgQElTX0ZJUkVGT1ggICAgPSB1YS5pbmRleE9mKCdmaXJlZm94JykgPiAtMVxuICAgICAgICBASVNfQ0hST01FX0lPUyA9IGlmIHVhLm1hdGNoKCdjcmlvcycpIHRoZW4gdHJ1ZSBlbHNlIGZhbHNlICMgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMTM4MDgwNTNcblxuICAgICAgICBudWxsXG5cbiAgICBvYmplY3RDb21wbGV0ZSA6ID0+XG5cbiAgICAgICAgQG9ialJlYWR5KytcbiAgICAgICAgQGluaXRBcHAoKSBpZiBAb2JqUmVhZHkgPj0gNFxuXG4gICAgICAgIG51bGxcblxuICAgIGluaXQgOiA9PlxuXG4gICAgICAgIEBpbml0T2JqZWN0cygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdE9iamVjdHMgOiA9PlxuXG4gICAgICAgIEB0ZW1wbGF0ZXMgPSBuZXcgVGVtcGxhdGVzIFwiL2RhdGEvdGVtcGxhdGVzI3soaWYgQExJVkUgdGhlbiAnLm1pbicgZWxzZSAnJyl9LnhtbFwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGxvY2FsZSAgICA9IG5ldyBMb2NhbGUgXCIvZGF0YS9sb2NhbGVzL3N0cmluZ3MuanNvblwiLCBAb2JqZWN0Q29tcGxldGVcbiAgICAgICAgQGFuYWx5dGljcyA9IG5ldyBBbmFseXRpY3MgXCIvZGF0YS90cmFja2luZy5qc29uXCIsIEBvYmplY3RDb21wbGV0ZVxuICAgICAgICBAYXBwRGF0YSAgID0gbmV3IEFwcERhdGEgQG9iamVjdENvbXBsZXRlXG5cbiAgICAgICAgIyBpZiBuZXcgb2JqZWN0cyBhcmUgYWRkZWQgZG9uJ3QgZm9yZ2V0IHRvIGNoYW5nZSB0aGUgYEBvYmplY3RDb21wbGV0ZWAgZnVuY3Rpb25cblxuICAgICAgICBudWxsXG5cbiAgICBpbml0U0RLcyA6ID0+XG5cbiAgICAgICAgRmFjZWJvb2subG9hZCgpXG4gICAgICAgIEdvb2dsZVBsdXMubG9hZCgpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaW5pdEFwcCA6ID0+XG5cbiAgICAgICAgQHNldEZsYWdzKClcblxuICAgICAgICAjIyMgU3RhcnRzIGFwcGxpY2F0aW9uICMjI1xuICAgICAgICBAYXBwVmlldyA9IG5ldyBBcHBWaWV3XG4gICAgICAgIEByb3V0ZXIgID0gbmV3IFJvdXRlclxuICAgICAgICBAbmF2ICAgICA9IG5ldyBOYXZcbiAgICAgICAgQGF1dGggICAgPSBuZXcgQXV0aE1hbmFnZXJcbiAgICAgICAgQHNoYXJlICAgPSBuZXcgU2hhcmVcblxuICAgICAgICBAZ28oKVxuXG4gICAgICAgIEBpbml0U0RLcygpXG5cbiAgICAgICAgbnVsbFxuXG4gICAgZ28gOiA9PlxuXG4gICAgICAgICMjIyBBZnRlciBldmVyeXRoaW5nIGlzIGxvYWRlZCwga2lja3Mgb2ZmIHdlYnNpdGUgIyMjXG4gICAgICAgIEBhcHBWaWV3LnJlbmRlcigpXG5cbiAgICAgICAgIyMjIHJlbW92ZSByZWR1bmRhbnQgaW5pdGlhbGlzYXRpb24gbWV0aG9kcyAvIHByb3BlcnRpZXMgIyMjXG4gICAgICAgIEBjbGVhbnVwKClcblxuICAgICAgICBudWxsXG5cbiAgICBjbGVhbnVwIDogPT5cblxuICAgICAgICBmb3IgZm4gaW4gQF90b0NsZWFuXG4gICAgICAgICAgICBAW2ZuXSA9IG51bGxcbiAgICAgICAgICAgIGRlbGV0ZSBAW2ZuXVxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4vZGF0YS9BYnN0cmFjdERhdGEnXG5SZXF1ZXN0ZXIgICAgPSByZXF1aXJlICcuL3V0aWxzL1JlcXVlc3RlcidcbkFQSSAgICAgICAgICA9IHJlcXVpcmUgJy4vZGF0YS9BUEknXG5cbmNsYXNzIEFwcERhdGEgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuICAgIGNhbGxiYWNrIDogbnVsbFxuXG4gICAgY29uc3RydWN0b3IgOiAoQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICMjI1xuXG4gICAgICAgIGFkZCBhbGwgZGF0YSBjbGFzc2VzIGhlcmVcblxuICAgICAgICAjIyNcblxuICAgICAgICBzdXBlcigpXG5cbiAgICAgICAgQGdldFN0YXJ0RGF0YSgpXG5cbiAgICAgICAgcmV0dXJuIG51bGxcblxuICAgICMjI1xuICAgIGdldCBhcHAgYm9vdHN0cmFwIGRhdGEgLSBlbWJlZCBpbiBIVE1MIG9yIEFQSSBlbmRwb2ludFxuICAgICMjI1xuICAgIGdldFN0YXJ0RGF0YSA6ID0+XG4gICAgICAgIFxuICAgICAgICBpZiBBUEkuZ2V0KCdzdGFydCcpXG5cbiAgICAgICAgICAgIHIgPSBSZXF1ZXN0ZXIucmVxdWVzdFxuICAgICAgICAgICAgICAgIHVybCAgOiBBUEkuZ2V0KCdzdGFydCcpXG4gICAgICAgICAgICAgICAgdHlwZSA6ICdHRVQnXG5cbiAgICAgICAgICAgIHIuZG9uZSBAb25TdGFydERhdGFSZWNlaXZlZFxuICAgICAgICAgICAgci5mYWlsID0+XG5cbiAgICAgICAgICAgICAgICAjIGNvbnNvbGUuZXJyb3IgXCJlcnJvciBsb2FkaW5nIGFwaSBzdGFydCBkYXRhXCJcblxuICAgICAgICAgICAgICAgICMjI1xuICAgICAgICAgICAgICAgIHRoaXMgaXMgb25seSB0ZW1wb3JhcnksIHdoaWxlIHRoZXJlIGlzIG5vIGJvb3RzdHJhcCBkYXRhIGhlcmUsIG5vcm1hbGx5IHdvdWxkIGhhbmRsZSBlcnJvciAvIGZhaWxcbiAgICAgICAgICAgICAgICAjIyNcbiAgICAgICAgICAgICAgICBAY2FsbGJhY2s/KClcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIG9uU3RhcnREYXRhUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICAjIyNcblxuICAgICAgICBib290c3RyYXAgZGF0YSByZWNlaXZlZCwgYXBwIHJlYWR5IHRvIGdvXG5cbiAgICAgICAgIyMjXG5cbiAgICAgICAgQGNhbGxiYWNrPygpXG5cbiAgICAgICAgbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcERhdGFcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4vdmlldy9BYnN0cmFjdFZpZXcnXG5QcmVsb2FkZXIgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9QcmVsb2FkZXInXG5IZWFkZXIgICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9IZWFkZXInXG5XcmFwcGVyICAgICAgPSByZXF1aXJlICcuL3ZpZXcvYmFzZS9XcmFwcGVyJ1xuRm9vdGVyICAgICAgID0gcmVxdWlyZSAnLi92aWV3L2Jhc2UvRm9vdGVyJ1xuTW9kYWxNYW5hZ2VyID0gcmVxdWlyZSAnLi92aWV3L21vZGFscy9fTW9kYWxNYW5hZ2VyJ1xuTWVkaWFRdWVyaWVzID0gcmVxdWlyZSAnLi91dGlscy9NZWRpYVF1ZXJpZXMnXG5cbmNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuICAgIHRlbXBsYXRlIDogJ21haW4nXG5cbiAgICAkd2luZG93ICA6IG51bGxcbiAgICAkYm9keSAgICA6IG51bGxcblxuICAgIHdyYXBwZXIgIDogbnVsbFxuICAgIGZvb3RlciAgIDogbnVsbFxuXG4gICAgZGltcyA6XG4gICAgICAgIHcgOiBudWxsXG4gICAgICAgIGggOiBudWxsXG4gICAgICAgIG8gOiBudWxsXG4gICAgICAgIGMgOiBudWxsXG5cbiAgICBldmVudHMgOlxuICAgICAgICAnY2xpY2sgYScgOiAnbGlua01hbmFnZXInXG5cbiAgICBFVkVOVF9VUERBVEVfRElNRU5TSU9OUyA6ICdFVkVOVF9VUERBVEVfRElNRU5TSU9OUydcblxuICAgIE1PQklMRV9XSURUSCA6IDcwMFxuICAgIE1PQklMRSAgICAgICA6ICdtb2JpbGUnXG4gICAgTk9OX01PQklMRSAgIDogJ25vbl9tb2JpbGUnXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQCR3aW5kb3cgPSAkKHdpbmRvdylcbiAgICAgICAgQCRib2R5ICAgPSAkKCdib2R5JykuZXEoMClcblxuICAgICAgICBzdXBlcigpXG5cbiAgICBkaXNhYmxlVG91Y2g6ID0+XG5cbiAgICAgICAgQCR3aW5kb3cub24gJ3RvdWNobW92ZScsIEBvblRvdWNoTW92ZVxuICAgICAgICByZXR1cm5cblxuICAgIGVuYWJsZVRvdWNoOiA9PlxuXG4gICAgICAgIEAkd2luZG93Lm9mZiAndG91Y2htb3ZlJywgQG9uVG91Y2hNb3ZlXG4gICAgICAgIHJldHVyblxuXG4gICAgb25Ub3VjaE1vdmU6ICggZSApIC0+XG5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIHJldHVyblxuXG4gICAgcmVuZGVyIDogPT5cblxuICAgICAgICBAYmluZEV2ZW50cygpXG5cbiAgICAgICAgQHByZWxvYWRlciAgICA9IG5ldyBQcmVsb2FkZXJcbiAgICAgICAgQG1vZGFsTWFuYWdlciA9IG5ldyBNb2RhbE1hbmFnZXJcblxuICAgICAgICBAaGVhZGVyICA9IG5ldyBIZWFkZXJcbiAgICAgICAgQHdyYXBwZXIgPSBuZXcgV3JhcHBlclxuICAgICAgICBAZm9vdGVyICA9IG5ldyBGb290ZXJcblxuICAgICAgICBAXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGhlYWRlclxuICAgICAgICAgICAgLmFkZENoaWxkIEB3cmFwcGVyXG4gICAgICAgICAgICAuYWRkQ2hpbGQgQGZvb3RlclxuXG4gICAgICAgIEBvbkFsbFJlbmRlcmVkKClcbiAgICAgICAgcmV0dXJuXG5cbiAgICBiaW5kRXZlbnRzIDogPT5cblxuICAgICAgICBAb24gJ2FsbFJlbmRlcmVkJywgQG9uQWxsUmVuZGVyZWRcblxuICAgICAgICBAb25SZXNpemUoKVxuXG4gICAgICAgIEBvblJlc2l6ZSA9IF8uZGVib3VuY2UgQG9uUmVzaXplLCAzMDBcbiAgICAgICAgQCR3aW5kb3cub24gJ3Jlc2l6ZSBvcmllbnRhdGlvbmNoYW5nZScsIEBvblJlc2l6ZVxuICAgICAgICByZXR1cm5cblxuICAgIG9uQWxsUmVuZGVyZWQgOiA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJvbkFsbFJlbmRlcmVkIDogPT5cIlxuXG4gICAgICAgIEAkYm9keS5wcmVwZW5kIEAkZWxcblxuICAgICAgICBAYmVnaW4oKVxuICAgICAgICByZXR1cm5cblxuICAgIGJlZ2luIDogPT5cblxuICAgICAgICBAdHJpZ2dlciAnc3RhcnQnXG5cbiAgICAgICAgQENEKCkucm91dGVyLnN0YXJ0KClcblxuICAgICAgICBAcHJlbG9hZGVyLmhpZGUoKVxuICAgICAgICBAdXBkYXRlTWVkaWFRdWVyaWVzTG9nKClcbiAgICAgICAgcmV0dXJuXG5cbiAgICBvblJlc2l6ZSA6ID0+XG5cbiAgICAgICAgQGdldERpbXMoKVxuICAgICAgICBAdXBkYXRlTWVkaWFRdWVyaWVzTG9nKClcbiAgICAgICAgcmV0dXJuXG5cbiAgICB1cGRhdGVNZWRpYVF1ZXJpZXNMb2cgOiA9PlxuXG4gICAgICAgIGlmIEBoZWFkZXIgdGhlbiBAaGVhZGVyLiRlbC5maW5kKFwiLmJyZWFrcG9pbnRcIikuaHRtbCBcIjxkaXYgY2xhc3M9J2wnPkNVUlJFTlQgQlJFQUtQT0lOVDo8L2Rpdj48ZGl2IGNsYXNzPSdiJz4je01lZGlhUXVlcmllcy5nZXRCcmVha3BvaW50KCl9PC9kaXY+XCJcbiAgICAgICAgcmV0dXJuXG5cbiAgICBnZXREaW1zIDogPT5cblxuICAgICAgICB3ID0gd2luZG93LmlubmVyV2lkdGggb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoIG9yIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgICAgICAgaCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG5cbiAgICAgICAgQGRpbXMgPVxuICAgICAgICAgICAgdyA6IHdcbiAgICAgICAgICAgIGggOiBoXG4gICAgICAgICAgICBvIDogaWYgaCA+IHcgdGhlbiAncG9ydHJhaXQnIGVsc2UgJ2xhbmRzY2FwZSdcbiAgICAgICAgICAgIGMgOiBpZiB3IDw9IEBNT0JJTEVfV0lEVEggdGhlbiBATU9CSUxFIGVsc2UgQE5PTl9NT0JJTEVcblxuICAgICAgICBAdHJpZ2dlciBARVZFTlRfVVBEQVRFX0RJTUVOU0lPTlMsIEBkaW1zXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBsaW5rTWFuYWdlciA6IChlKSA9PlxuXG4gICAgICAgIGhyZWYgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyBocmVmXG5cbiAgICAgICAgQG5hdmlnYXRlVG9VcmwgaHJlZiwgZVxuXG4gICAgICAgIHJldHVyblxuXG4gICAgbmF2aWdhdGVUb1VybCA6ICggaHJlZiwgZSA9IG51bGwgKSA9PlxuXG4gICAgICAgIHJvdXRlICAgPSBpZiBocmVmLm1hdGNoKEBDRCgpLkJBU0VfUEFUSCkgdGhlbiBocmVmLnNwbGl0KEBDRCgpLkJBU0VfUEFUSClbMV0gZWxzZSBocmVmXG4gICAgICAgIHNlY3Rpb24gPSBpZiByb3V0ZS5pbmRleE9mKCcvJykgaXMgMCB0aGVuIHJvdXRlLnNwbGl0KCcvJylbMV0gZWxzZSByb3V0ZVxuXG4gICAgICAgIGlmIEBDRCgpLm5hdi5nZXRTZWN0aW9uIHNlY3Rpb25cbiAgICAgICAgICAgIGU/LnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgIEBDRCgpLnJvdXRlci5uYXZpZ2F0ZVRvIHJvdXRlXG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBAaGFuZGxlRXh0ZXJuYWxMaW5rIGhyZWZcblxuICAgICAgICByZXR1cm5cblxuICAgIGhhbmRsZUV4dGVybmFsTGluayA6IChkYXRhKSA9PiBcblxuICAgICAgICAjIyNcblxuICAgICAgICBiaW5kIHRyYWNraW5nIGV2ZW50cyBpZiBuZWNlc3NhcnlcblxuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm5cblxubW9kdWxlLmV4cG9ydHMgPSBBcHBWaWV3XG4iLCJUZW1wbGF0ZU1vZGVsID0gcmVxdWlyZSAnLi4vLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblxuY2xhc3MgVGVtcGxhdGVzQ29sbGVjdGlvbiBleHRlbmRzIEJhY2tib25lLkNvbGxlY3Rpb25cblxuXHRtb2RlbCA6IFRlbXBsYXRlTW9kZWxcblxubW9kdWxlLmV4cG9ydHMgPSBUZW1wbGF0ZXNDb2xsZWN0aW9uXG4iLCJBUElSb3V0ZU1vZGVsID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvQVBJUm91dGVNb2RlbCdcblxuY2xhc3MgQVBJXG5cblx0QG1vZGVsIDogbmV3IEFQSVJvdXRlTW9kZWxcblxuXHRAZ2V0Q29udGFudHMgOiA9PlxuXG5cdFx0IyMjIGFkZCBtb3JlIGlmIHdlIHdhbm5hIHVzZSBpbiBBUEkgc3RyaW5ncyAjIyNcblx0XHRCQVNFX1BBVEggOiBAQ0QoKS5CQVNFX1BBVEhcblxuXHRAZ2V0IDogKG5hbWUsIHZhcnMpID0+XG5cblx0XHR2YXJzID0gJC5leHRlbmQgdHJ1ZSwgdmFycywgQGdldENvbnRhbnRzKClcblx0XHRyZXR1cm4gQHN1cHBsYW50U3RyaW5nIEBtb2RlbC5nZXQobmFtZSksIHZhcnNcblxuXHRAc3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdIG9yIGlmIHR5cGVvZiB2YWxzW2JdIGlzICdudW1iZXInIHRoZW4gdmFsc1tiXS50b1N0cmluZygpIGVsc2UgJydcblx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0QENEIDogPT5cblxuXHRcdHJldHVybiB3aW5kb3cuQ0RcblxubW9kdWxlLmV4cG9ydHMgPSBBUElcbiIsImNsYXNzIEFic3RyYWN0RGF0YVxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdF8uZXh0ZW5kIEAsIEJhY2tib25lLkV2ZW50c1xuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3REYXRhXG4iLCJMb2NhbGVzTW9kZWwgPSByZXF1aXJlICcuLi9tb2RlbHMvY29yZS9Mb2NhbGVzTW9kZWwnXG5BUEkgICAgICAgICAgPSByZXF1aXJlICcuLi9kYXRhL0FQSSdcblxuIyMjXG4jIExvY2FsZSBMb2FkZXIgI1xuXG5GaXJlcyBiYWNrIGFuIGV2ZW50IHdoZW4gY29tcGxldGVcblxuIyMjXG5jbGFzcyBMb2NhbGVcblxuICAgIGxhbmcgICAgIDogbnVsbFxuICAgIGRhdGEgICAgIDogbnVsbFxuICAgIGNhbGxiYWNrIDogbnVsbFxuICAgIGJhY2t1cCAgIDogbnVsbFxuICAgIGRlZmF1bHQgIDogJ2VuLWdiJ1xuXG4gICAgY29uc3RydWN0b3IgOiAoZGF0YSwgY2IpIC0+XG5cbiAgICAgICAgIyMjIHN0YXJ0IExvY2FsZSBMb2FkZXIsIGRlZmluZSBsb2NhbGUgYmFzZWQgb24gYnJvd3NlciBsYW5ndWFnZSAjIyNcblxuICAgICAgICBAY2FsbGJhY2sgPSBjYlxuICAgICAgICBAYmFja3VwID0gZGF0YVxuXG4gICAgICAgIEBsYW5nID0gQGdldExhbmcoKVxuXG4gICAgICAgIGlmIEFQSS5nZXQoJ2xvY2FsZScsIHsgY29kZSA6IEBsYW5nIH0pXG5cbiAgICAgICAgICAgICQuYWpheFxuICAgICAgICAgICAgICAgIHVybCAgICAgOiBBUEkuZ2V0KCAnbG9jYWxlJywgeyBjb2RlIDogQGxhbmcgfSApXG4gICAgICAgICAgICAgICAgdHlwZSAgICA6ICdHRVQnXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA6IEBvblN1Y2Nlc3NcbiAgICAgICAgICAgICAgICBlcnJvciAgIDogQGxvYWRCYWNrdXBcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEBsb2FkQmFja3VwKClcblxuICAgICAgICBudWxsXG4gICAgICAgICAgICBcbiAgICBnZXRMYW5nIDogPT5cblxuICAgICAgICBpZiB3aW5kb3cubG9jYXRpb24uc2VhcmNoIGFuZCB3aW5kb3cubG9jYXRpb24uc2VhcmNoLm1hdGNoKCdsYW5nPScpXG5cbiAgICAgICAgICAgIGxhbmcgPSB3aW5kb3cubG9jYXRpb24uc2VhcmNoLnNwbGl0KCdsYW5nPScpWzFdLnNwbGl0KCcmJylbMF1cblxuICAgICAgICBlbHNlIGlmIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZVxuXG4gICAgICAgICAgICBsYW5nID0gd2luZG93LmNvbmZpZy5sb2NhbGVDb2RlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBsYW5nID0gQGRlZmF1bHRcblxuICAgICAgICBsYW5nXG5cbiAgICBvblN1Y2Nlc3MgOiAoZXZlbnQpID0+XG5cbiAgICAgICAgIyMjIEZpcmVzIGJhY2sgYW4gZXZlbnQgb25jZSBpdCdzIGNvbXBsZXRlICMjI1xuXG4gICAgICAgIGQgPSBudWxsXG5cbiAgICAgICAgaWYgZXZlbnQucmVzcG9uc2VUZXh0XG4gICAgICAgICAgICBkID0gSlNPTi5wYXJzZSBldmVudC5yZXNwb25zZVRleHRcbiAgICAgICAgZWxzZSBcbiAgICAgICAgICAgIGQgPSBldmVudFxuXG4gICAgICAgIEBkYXRhID0gbmV3IExvY2FsZXNNb2RlbCBkXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgIGxvYWRCYWNrdXAgOiA9PlxuXG4gICAgICAgICMjIyBXaGVuIEFQSSBub3QgYXZhaWxhYmxlLCB0cmllcyB0byBsb2FkIHRoZSBzdGF0aWMgLnR4dCBsb2NhbGUgIyMjXG5cbiAgICAgICAgJC5hamF4IFxuICAgICAgICAgICAgdXJsICAgICAgOiBAYmFja3VwXG4gICAgICAgICAgICBkYXRhVHlwZSA6ICdqc29uJ1xuICAgICAgICAgICAgY29tcGxldGUgOiBAb25TdWNjZXNzXG4gICAgICAgICAgICBlcnJvciAgICA6ID0+IGNvbnNvbGUubG9nICdlcnJvciBvbiBsb2FkaW5nIGJhY2t1cCdcblxuICAgICAgICBudWxsXG5cbiAgICBnZXQgOiAoaWQpID0+XG5cbiAgICAgICAgIyMjIGdldCBTdHJpbmcgZnJvbSBsb2NhbGVcbiAgICAgICAgKyBpZCA6IHN0cmluZyBpZCBvZiB0aGUgTG9jYWxpc2VkIFN0cmluZ1xuICAgICAgICAjIyNcblxuICAgICAgICByZXR1cm4gQGRhdGEuZ2V0U3RyaW5nIGlkXG5cbiAgICBnZXRMb2NhbGVJbWFnZSA6ICh1cmwpID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5jb25maWcuQ0ROICsgXCIvaW1hZ2VzL2xvY2FsZS9cIiArIHdpbmRvdy5jb25maWcubG9jYWxlQ29kZSArIFwiL1wiICsgdXJsXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxlXG4iLCJUZW1wbGF0ZU1vZGVsICAgICAgID0gcmVxdWlyZSAnLi4vbW9kZWxzL2NvcmUvVGVtcGxhdGVNb2RlbCdcblRlbXBsYXRlc0NvbGxlY3Rpb24gPSByZXF1aXJlICcuLi9jb2xsZWN0aW9ucy9jb3JlL1RlbXBsYXRlc0NvbGxlY3Rpb24nXG5cbmNsYXNzIFRlbXBsYXRlc1xuXG4gICAgdGVtcGxhdGVzIDogbnVsbFxuICAgIGNiICAgICAgICA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yIDogKHRlbXBsYXRlcywgY2FsbGJhY2spIC0+XG5cbiAgICAgICAgQGNiID0gY2FsbGJhY2tcblxuICAgICAgICAkLmFqYXggdXJsIDogdGVtcGxhdGVzLCBzdWNjZXNzIDogQHBhcnNlWE1MXG4gICAgICAgICAgIFxuICAgICAgICBudWxsXG5cbiAgICBwYXJzZVhNTCA6IChkYXRhKSA9PlxuXG4gICAgICAgIHRlbXAgPSBbXVxuXG4gICAgICAgICQoZGF0YSkuZmluZCgndGVtcGxhdGUnKS5lYWNoIChrZXksIHZhbHVlKSAtPlxuICAgICAgICAgICAgJHZhbHVlID0gJCh2YWx1ZSlcbiAgICAgICAgICAgIHRlbXAucHVzaCBuZXcgVGVtcGxhdGVNb2RlbFxuICAgICAgICAgICAgICAgIGlkICAgOiAkdmFsdWUuYXR0cignaWQnKS50b1N0cmluZygpXG4gICAgICAgICAgICAgICAgdGV4dCA6ICQudHJpbSAkdmFsdWUudGV4dCgpXG5cbiAgICAgICAgQHRlbXBsYXRlcyA9IG5ldyBUZW1wbGF0ZXNDb2xsZWN0aW9uIHRlbXBcblxuICAgICAgICBAY2I/KClcbiAgICAgICAgXG4gICAgICAgIG51bGwgICAgICAgIFxuXG4gICAgZ2V0IDogKGlkKSA9PlxuXG4gICAgICAgIHQgPSBAdGVtcGxhdGVzLndoZXJlIGlkIDogaWRcbiAgICAgICAgdCA9IHRbMF0uZ2V0ICd0ZXh0J1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICQudHJpbSB0XG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVzXG4iLCJjbGFzcyBBUElSb3V0ZU1vZGVsIGV4dGVuZHMgQmFja2JvbmUuRGVlcE1vZGVsXG5cbiAgICBkZWZhdWx0cyA6XG5cbiAgICAgICAgc3RhcnQgICAgICAgICA6IFwiXCIgIyBFZzogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL3N0YXJ0XCJcblxuICAgICAgICBsb2NhbGUgICAgICAgIDogXCJcIiAjIEVnOiBcInt7IEJBU0VfUEFUSCB9fS9hcGkvbDEwbi97eyBjb2RlIH19XCJcblxuICAgICAgICB1c2VyICAgICAgICAgIDpcbiAgICAgICAgICAgIGxvZ2luICAgICAgOiBcInt7IEJBU0VfUEFUSCB9fS9hcGkvdXNlci9sb2dpblwiXG4gICAgICAgICAgICByZWdpc3RlciAgIDogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL3VzZXIvcmVnaXN0ZXJcIlxuICAgICAgICAgICAgcGFzc3dvcmQgICA6IFwie3sgQkFTRV9QQVRIIH19L2FwaS91c2VyL3Bhc3N3b3JkXCJcbiAgICAgICAgICAgIHVwZGF0ZSAgICAgOiBcInt7IEJBU0VfUEFUSCB9fS9hcGkvdXNlci91cGRhdGVcIlxuICAgICAgICAgICAgbG9nb3V0ICAgICA6IFwie3sgQkFTRV9QQVRIIH19L2FwaS91c2VyL2xvZ291dFwiXG4gICAgICAgICAgICByZW1vdmUgICAgIDogXCJ7eyBCQVNFX1BBVEggfX0vYXBpL3VzZXIvcmVtb3ZlXCJcblxubW9kdWxlLmV4cG9ydHMgPSBBUElSb3V0ZU1vZGVsXG4iLCJjbGFzcyBMb2NhbGVzTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4gICAgZGVmYXVsdHMgOlxuICAgICAgICBjb2RlICAgICA6IG51bGxcbiAgICAgICAgbGFuZ3VhZ2UgOiBudWxsXG4gICAgICAgIHN0cmluZ3MgIDogbnVsbFxuICAgICAgICAgICAgXG4gICAgZ2V0X2xhbmd1YWdlIDogPT5cbiAgICAgICAgcmV0dXJuIEBnZXQoJ2xhbmd1YWdlJylcblxuICAgIGdldFN0cmluZyA6IChpZCkgPT5cbiAgICAgICAgKChyZXR1cm4gZSBpZihhIGlzIGlkKSkgZm9yIGEsIGUgb2Ygdlsnc3RyaW5ncyddKSBmb3IgaywgdiBvZiBAZ2V0KCdzdHJpbmdzJylcbiAgICAgICAgY29uc29sZS53YXJuIFwiTG9jYWxlcyAtPiBub3QgZm91bmQgc3RyaW5nOiAje2lkfVwiXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVzTW9kZWxcbiIsImNsYXNzIFRlbXBsYXRlTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG5cdGRlZmF1bHRzIDogXG5cblx0XHRpZCAgIDogXCJcIlxuXHRcdHRleHQgOiBcIlwiXG5cbm1vZHVsZS5leHBvcnRzID0gVGVtcGxhdGVNb2RlbFxuIiwiQWJzdHJhY3RWaWV3ID0gcmVxdWlyZSAnLi4vdmlldy9BYnN0cmFjdFZpZXcnXG5Sb3V0ZXIgICAgICAgPSByZXF1aXJlICcuL1JvdXRlcidcblxuY2xhc3MgTmF2IGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cbiAgICBARVZFTlRfQ0hBTkdFX1ZJRVcgICAgIDogJ0VWRU5UX0NIQU5HRV9WSUVXJ1xuICAgIEBFVkVOVF9DSEFOR0VfU1VCX1ZJRVcgOiAnRVZFTlRfQ0hBTkdFX1NVQl9WSUVXJ1xuXG4gICAgc2VjdGlvbnMgOlxuICAgICAgICBIT01FICAgICAgIDogJydcbiAgICAgICAgQUJPVVQgICAgICA6ICdhYm91dCdcbiAgICAgICAgQ09OVFJJQlVURSA6ICdjb250cmlidXRlJ1xuXG4gICAgY3VycmVudCAgOiBhcmVhIDogbnVsbCwgc3ViIDogbnVsbFxuICAgIHByZXZpb3VzIDogYXJlYSA6IG51bGwsIHN1YiA6IG51bGxcblxuICAgIGNvbnN0cnVjdG9yOiAtPlxuXG4gICAgICAgIEBDRCgpLnJvdXRlci5vbiBSb3V0ZXIuRVZFTlRfSEFTSF9DSEFOR0VELCBAY2hhbmdlVmlld1xuXG4gICAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZ2V0U2VjdGlvbiA6IChzZWN0aW9uKSA9PlxuXG4gICAgICAgIGlmIHNlY3Rpb24gaXMgJycgdGhlbiByZXR1cm4gdHJ1ZVxuXG4gICAgICAgIGZvciBzZWN0aW9uTmFtZSwgdXJpIG9mIEBzZWN0aW9uc1xuICAgICAgICAgICAgaWYgdXJpIGlzIHNlY3Rpb24gdGhlbiByZXR1cm4gc2VjdGlvbk5hbWVcblxuICAgICAgICBmYWxzZVxuXG4gICAgY2hhbmdlVmlldzogKGFyZWEsIHN1YiwgcGFyYW1zKSA9PlxuXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJhcmVhXCIsYXJlYVxuICAgICAgICAjIGNvbnNvbGUubG9nIFwic3ViXCIsc3ViXG4gICAgICAgICMgY29uc29sZS5sb2cgXCJwYXJhbXNcIixwYXJhbXNcblxuICAgICAgICBAcHJldmlvdXMgPSBAY3VycmVudFxuICAgICAgICBAY3VycmVudCAgPSBhcmVhIDogYXJlYSwgc3ViIDogc3ViXG5cbiAgICAgICAgaWYgQHByZXZpb3VzLmFyZWEgYW5kIEBwcmV2aW91cy5hcmVhIGlzIEBjdXJyZW50LmFyZWFcbiAgICAgICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfU1VCX1ZJRVcsIEBjdXJyZW50XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEB0cmlnZ2VyIE5hdi5FVkVOVF9DSEFOR0VfVklFVywgQHByZXZpb3VzLCBAY3VycmVudFxuICAgICAgICAgICAgQHRyaWdnZXIgTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGN1cnJlbnRcblxuICAgICAgICBpZiBAQ0QoKS5hcHBWaWV3Lm1vZGFsTWFuYWdlci5pc09wZW4oKSB0aGVuIEBDRCgpLmFwcFZpZXcubW9kYWxNYW5hZ2VyLmhpZGVPcGVuTW9kYWwoKVxuXG4gICAgICAgIEBzZXRQYWdlVGl0bGUgYXJlYSwgc3ViXG5cbiAgICAgICAgbnVsbFxuXG4gICAgc2V0UGFnZVRpdGxlOiAoYXJlYSwgc3ViKSA9PlxuXG4gICAgICAgIHRpdGxlID0gXCJQQUdFIFRJVExFIEhFUkUgLSBMT0NBTElTRSBCQVNFRCBPTiBVUkxcIlxuXG4gICAgICAgIGlmIHdpbmRvdy5kb2N1bWVudC50aXRsZSBpc250IHRpdGxlIHRoZW4gd2luZG93LmRvY3VtZW50LnRpdGxlID0gdGl0bGVcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTmF2XG4iLCJjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuICAgIEBFVkVOVF9IQVNIX0NIQU5HRUQgOiAnRVZFTlRfSEFTSF9DSEFOR0VEJ1xuXG4gICAgRklSU1RfUk9VVEUgOiB0cnVlXG5cbiAgICByb3V0ZXMgOlxuICAgICAgICAnKC8pKDphcmVhKSgvOnN1YikoLyknIDogJ2hhc2hDaGFuZ2VkJ1xuICAgICAgICAnKmFjdGlvbnMnICAgICAgICAgICAgIDogJ25hdmlnYXRlVG8nXG5cbiAgICBhcmVhICAgOiBudWxsXG4gICAgc3ViICAgIDogbnVsbFxuICAgIHBhcmFtcyA6IG51bGxcblxuICAgIHN0YXJ0IDogPT5cblxuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0IFxuICAgICAgICAgICAgcHVzaFN0YXRlIDogdHJ1ZVxuICAgICAgICAgICAgcm9vdCAgICAgIDogJy8nXG5cbiAgICAgICAgbnVsbFxuXG4gICAgaGFzaENoYW5nZWQgOiAoQGFyZWEgPSBudWxsLCBAc3ViID0gbnVsbCkgPT5cblxuICAgICAgICBjb25zb2xlLmxvZyBcIj4+IEVWRU5UX0hBU0hfQ0hBTkdFRCBAYXJlYSA9ICN7QGFyZWF9LCBAc3ViID0gI3tAc3VifSA8PFwiXG5cbiAgICAgICAgaWYgQEZJUlNUX1JPVVRFIHRoZW4gQEZJUlNUX1JPVVRFID0gZmFsc2VcblxuICAgICAgICBpZiAhQGFyZWEgdGhlbiBAYXJlYSA9IEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cbiAgICAgICAgQHRyaWdnZXIgUm91dGVyLkVWRU5UX0hBU0hfQ0hBTkdFRCwgQGFyZWEsIEBzdWIsIEBwYXJhbXNcblxuICAgICAgICBudWxsXG5cbiAgICBuYXZpZ2F0ZVRvIDogKHdoZXJlID0gJycsIHRyaWdnZXIgPSB0cnVlLCByZXBsYWNlID0gZmFsc2UsIEBwYXJhbXMpID0+XG5cbiAgICAgICAgaWYgd2hlcmUuY2hhckF0KDApIGlzbnQgXCIvXCJcbiAgICAgICAgICAgIHdoZXJlID0gXCIvI3t3aGVyZX1cIlxuICAgICAgICBpZiB3aGVyZS5jaGFyQXQoIHdoZXJlLmxlbmd0aC0xICkgaXNudCBcIi9cIlxuICAgICAgICAgICAgd2hlcmUgPSBcIiN7d2hlcmV9L1wiXG5cbiAgICAgICAgaWYgIXRyaWdnZXJcbiAgICAgICAgICAgIEB0cmlnZ2VyIFJvdXRlci5FVkVOVF9IQVNIX0NIQU5HRUQsIHdoZXJlLCBudWxsLCBAcGFyYW1zXG4gICAgICAgICAgICByZXR1cm5cblxuICAgICAgICBAbmF2aWdhdGUgd2hlcmUsIHRyaWdnZXI6IHRydWUsIHJlcGxhY2U6IHJlcGxhY2VcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlclxuIiwiIyMjXG5BbmFseXRpY3Mgd3JhcHBlclxuIyMjXG5jbGFzcyBBbmFseXRpY3NcblxuICAgIHRhZ3MgICAgOiBudWxsXG4gICAgc3RhcnRlZCA6IGZhbHNlXG5cbiAgICBhdHRlbXB0cyAgICAgICAgOiAwXG4gICAgYWxsb3dlZEF0dGVtcHRzIDogNVxuXG4gICAgY29uc3RydWN0b3IgOiAodGFncywgQGNhbGxiYWNrKSAtPlxuXG4gICAgICAgICQuZ2V0SlNPTiB0YWdzLCBAb25UYWdzUmVjZWl2ZWRcblxuICAgICAgICByZXR1cm4gbnVsbFxuXG4gICAgb25UYWdzUmVjZWl2ZWQgOiAoZGF0YSkgPT5cblxuICAgICAgICBAdGFncyAgICA9IGRhdGFcbiAgICAgICAgQHN0YXJ0ZWQgPSB0cnVlXG4gICAgICAgIEBjYWxsYmFjaz8oKVxuXG4gICAgICAgIG51bGxcblxuICAgICMjI1xuICAgIEBwYXJhbSBzdHJpbmcgaWQgb2YgdGhlIHRyYWNraW5nIHRhZyB0byBiZSBwdXNoZWQgb24gQW5hbHl0aWNzIFxuICAgICMjI1xuICAgIHRyYWNrIDogKHBhcmFtKSA9PlxuXG4gICAgICAgIHJldHVybiBpZiAhQHN0YXJ0ZWRcblxuICAgICAgICBpZiBwYXJhbVxuXG4gICAgICAgICAgICB2ID0gQHRhZ3NbcGFyYW1dXG5cbiAgICAgICAgICAgIGlmIHZcblxuICAgICAgICAgICAgICAgIGFyZ3MgPSBbJ3NlbmQnLCAnZXZlbnQnXVxuICAgICAgICAgICAgICAgICggYXJncy5wdXNoKGFyZykgKSBmb3IgYXJnIGluIHZcblxuICAgICAgICAgICAgICAgICMgbG9hZGluZyBHQSBhZnRlciBtYWluIGFwcCBKUywgc28gZXh0ZXJuYWwgc2NyaXB0IG1heSBub3QgYmUgaGVyZSB5ZXRcbiAgICAgICAgICAgICAgICBpZiB3aW5kb3cuZ2FcbiAgICAgICAgICAgICAgICAgICAgZ2EuYXBwbHkgbnVsbCwgYXJnc1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgQGF0dGVtcHRzID49IEBhbGxvd2VkQXR0ZW1wdHNcbiAgICAgICAgICAgICAgICAgICAgQHN0YXJ0ZWQgPSBmYWxzZVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgQHRyYWNrIHBhcmFtXG4gICAgICAgICAgICAgICAgICAgICAgICBAYXR0ZW1wdHMrK1xuICAgICAgICAgICAgICAgICAgICAsIDIwMDBcblxuICAgICAgICBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQW5hbHl0aWNzXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcbkZhY2Vib29rICAgICA9IHJlcXVpcmUgJy4uL3V0aWxzL0ZhY2Vib29rJ1xuR29vZ2xlUGx1cyAgID0gcmVxdWlyZSAnLi4vdXRpbHMvR29vZ2xlUGx1cydcblxuY2xhc3MgQXV0aE1hbmFnZXIgZXh0ZW5kcyBBYnN0cmFjdERhdGFcblxuXHR1c2VyRGF0YSAgOiBudWxsXG5cblx0IyBAcHJvY2VzcyB0cnVlIGR1cmluZyBsb2dpbiBwcm9jZXNzXG5cdHByb2Nlc3MgICAgICA6IGZhbHNlXG5cdHByb2Nlc3NUaW1lciA6IG51bGxcblx0cHJvY2Vzc1dhaXQgIDogNTAwMFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB1c2VyRGF0YSAgPSBAQ0QoKS5hcHBEYXRhLlVTRVJcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0bG9naW4gOiAoc2VydmljZSwgY2I9bnVsbCkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCIrKysrIFBST0NFU1MgXCIsQHByb2Nlc3NcblxuXHRcdHJldHVybiBpZiBAcHJvY2Vzc1xuXG5cdFx0QHNob3dMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gdHJ1ZVxuXG5cdFx0JGRhdGFEZmQgPSAkLkRlZmVycmVkKClcblxuXHRcdHN3aXRjaCBzZXJ2aWNlXG5cdFx0XHR3aGVuICdnb29nbGUnXG5cdFx0XHRcdEdvb2dsZVBsdXMubG9naW4gJGRhdGFEZmRcblx0XHRcdHdoZW4gJ2ZhY2Vib29rJ1xuXHRcdFx0XHRGYWNlYm9vay5sb2dpbiAkZGF0YURmZFxuXG5cdFx0JGRhdGFEZmQuZG9uZSAocmVzKSA9PiBAYXV0aFN1Y2Nlc3Mgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuZmFpbCAocmVzKSA9PiBAYXV0aEZhaWwgc2VydmljZSwgcmVzXG5cdFx0JGRhdGFEZmQuYWx3YXlzICgpID0+IEBhdXRoQ2FsbGJhY2sgY2JcblxuXHRcdCMjI1xuXHRcdFVuZm9ydHVuYXRlbHkgbm8gY2FsbGJhY2sgaXMgZmlyZWQgaWYgdXNlciBtYW51YWxseSBjbG9zZXMgRysgbG9naW4gbW9kYWwsXG5cdFx0c28gdGhpcyBpcyB0byBhbGxvdyB0aGVtIHRvIGNsb3NlIHdpbmRvdyBhbmQgdGhlbiBzdWJzZXF1ZW50bHkgdHJ5IHRvIGxvZyBpbiBhZ2Fpbi4uLlxuXHRcdCMjI1xuXHRcdEBwcm9jZXNzVGltZXIgPSBzZXRUaW1lb3V0IEBhdXRoQ2FsbGJhY2ssIEBwcm9jZXNzV2FpdFxuXG5cdFx0JGRhdGFEZmRcblxuXHRhdXRoU3VjY2VzcyA6IChzZXJ2aWNlLCBkYXRhKSA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImxvZ2luIGNhbGxiYWNrIGZvciAje3NlcnZpY2V9LCBkYXRhID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aEZhaWwgOiAoc2VydmljZSwgZGF0YSkgPT5cblxuXHRcdCMgY29uc29sZS5sb2cgXCJsb2dpbiBmYWlsIGZvciAje3NlcnZpY2V9ID0+IFwiLCBkYXRhXG5cblx0XHRudWxsXG5cblx0YXV0aENhbGxiYWNrIDogKGNiPW51bGwpID0+XG5cblx0XHRyZXR1cm4gdW5sZXNzIEBwcm9jZXNzXG5cblx0XHRjbGVhclRpbWVvdXQgQHByb2Nlc3NUaW1lclxuXG5cdFx0QGhpZGVMb2FkZXIoKVxuXHRcdEBwcm9jZXNzID0gZmFsc2VcblxuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0IyMjXG5cdHNob3cgLyBoaWRlIHNvbWUgVUkgaW5kaWNhdG9yIHRoYXQgd2UgYXJlIHdhaXRpbmcgZm9yIHNvY2lhbCBuZXR3b3JrIHRvIHJlc3BvbmRcblx0IyMjXG5cdHNob3dMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcInNob3dMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5cdGhpZGVMb2FkZXIgOiA9PlxuXG5cdFx0IyBjb25zb2xlLmxvZyBcImhpZGVMb2FkZXJcIlxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhNYW5hZ2VyXG4iLCJBYnN0cmFjdERhdGEgPSByZXF1aXJlICcuLi9kYXRhL0Fic3RyYWN0RGF0YSdcblxuIyMjXG5cbkZhY2Vib29rIFNESyB3cmFwcGVyIC0gbG9hZCBhc3luY2hyb25vdXNseSwgc29tZSBoZWxwZXIgbWV0aG9kc1xuXG4jIyNcbmNsYXNzIEZhY2Vib29rIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgICAgIDogJy8vY29ubmVjdC5mYWNlYm9vay5uZXQvZW5fVVMvYWxsLmpzJ1xuXG5cdEBwZXJtaXNzaW9ucyA6ICdlbWFpbCdcblxuXHRAJGRhdGFEZmQgICAgOiBudWxsXG5cdEBsb2FkZWQgICAgICA6IGZhbHNlXG5cblx0QGxvYWQgOiA9PlxuXG5cdFx0IyMjXG5cdFx0VE8gRE9cblx0XHRpbmNsdWRlIHNjcmlwdCBsb2FkZXIgd2l0aCBjYWxsYmFjayB0byA6aW5pdFxuXHRcdCMjI1xuXHRcdCMgcmVxdWlyZSBbQHVybF0sIEBpbml0XG5cblx0XHRudWxsXG5cblx0QGluaXQgOiA9PlxuXG5cdFx0QGxvYWRlZCA9IHRydWVcblxuXHRcdEZCLmluaXRcblx0XHRcdGFwcElkICA6IHdpbmRvdy5jb25maWcuZmJfYXBwX2lkXG5cdFx0XHRzdGF0dXMgOiBmYWxzZVxuXHRcdFx0eGZibWwgIDogZmFsc2VcblxuXHRcdG51bGxcblxuXHRAbG9naW4gOiAoQCRkYXRhRGZkKSA9PlxuXG5cdFx0aWYgIUBsb2FkZWQgdGhlbiByZXR1cm4gQCRkYXRhRGZkLnJlamVjdCAnU0RLIG5vdCBsb2FkZWQnXG5cblx0XHRGQi5sb2dpbiAoIHJlcyApID0+XG5cblx0XHRcdGlmIHJlc1snc3RhdHVzJ10gaXMgJ2Nvbm5lY3RlZCdcblx0XHRcdFx0QGdldFVzZXJEYXRhIHJlc1snYXV0aFJlc3BvbnNlJ11bJ2FjY2Vzc1Rva2VuJ11cblx0XHRcdGVsc2Vcblx0XHRcdFx0QCRkYXRhRGZkLnJlamVjdCAnbm8gd2F5IGpvc2UnXG5cblx0XHQsIHsgc2NvcGU6IEBwZXJtaXNzaW9ucyB9XG5cblx0XHRudWxsXG5cblx0QGdldFVzZXJEYXRhIDogKHRva2VuKSA9PlxuXG5cdFx0dXNlckRhdGEgPSB7fVxuXHRcdHVzZXJEYXRhLmFjY2Vzc190b2tlbiA9IHRva2VuXG5cblx0XHQkbWVEZmQgICA9ICQuRGVmZXJyZWQoKVxuXHRcdCRwaWNEZmQgID0gJC5EZWZlcnJlZCgpXG5cblx0XHRGQi5hcGkgJy9tZScsIChyZXMpIC0+XG5cblx0XHRcdHVzZXJEYXRhLmZ1bGxfbmFtZSA9IHJlcy5uYW1lXG5cdFx0XHR1c2VyRGF0YS5zb2NpYWxfaWQgPSByZXMuaWRcblx0XHRcdHVzZXJEYXRhLmVtYWlsICAgICA9IHJlcy5lbWFpbCBvciBmYWxzZVxuXHRcdFx0JG1lRGZkLnJlc29sdmUoKVxuXG5cdFx0RkIuYXBpICcvbWUvcGljdHVyZScsIHsgJ3dpZHRoJzogJzIwMCcgfSwgKHJlcykgLT5cblxuXHRcdFx0dXNlckRhdGEucHJvZmlsZV9waWMgPSByZXMuZGF0YS51cmxcblx0XHRcdCRwaWNEZmQucmVzb2x2ZSgpXG5cblx0XHQkLndoZW4oJG1lRGZkLCAkcGljRGZkKS5kb25lID0+IEAkZGF0YURmZC5yZXNvbHZlIHVzZXJEYXRhXG5cblx0XHRudWxsXG5cblx0QHNoYXJlIDogKG9wdHMsIGNiKSA9PlxuXG5cdFx0RkIudWkge1xuXHRcdFx0bWV0aG9kICAgICAgOiBvcHRzLm1ldGhvZCBvciAnZmVlZCdcblx0XHRcdG5hbWUgICAgICAgIDogb3B0cy5uYW1lIG9yICcnXG5cdFx0XHRsaW5rICAgICAgICA6IG9wdHMubGluayBvciAnJ1xuXHRcdFx0cGljdHVyZSAgICAgOiBvcHRzLnBpY3R1cmUgb3IgJydcblx0XHRcdGNhcHRpb24gICAgIDogb3B0cy5jYXB0aW9uIG9yICcnXG5cdFx0XHRkZXNjcmlwdGlvbiA6IG9wdHMuZGVzY3JpcHRpb24gb3IgJydcblx0XHR9LCAocmVzcG9uc2UpIC0+XG5cdFx0XHRjYj8ocmVzcG9uc2UpXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZWJvb2tcbiIsIkFic3RyYWN0RGF0YSA9IHJlcXVpcmUgJy4uL2RhdGEvQWJzdHJhY3REYXRhJ1xuXG4jIyNcblxuR29vZ2xlKyBTREsgd3JhcHBlciAtIGxvYWQgYXN5bmNocm9ub3VzbHksIHNvbWUgaGVscGVyIG1ldGhvZHNcblxuIyMjXG5jbGFzcyBHb29nbGVQbHVzIGV4dGVuZHMgQWJzdHJhY3REYXRhXG5cblx0QHVybCAgICAgIDogJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudDpwbHVzb25lLmpzJ1xuXG5cdEBwYXJhbXMgICA6XG5cdFx0J2NsaWVudGlkJyAgICAgOiBudWxsXG5cdFx0J2NhbGxiYWNrJyAgICAgOiBudWxsXG5cdFx0J3Njb3BlJyAgICAgICAgOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5lbWFpbCdcblx0XHQnY29va2llcG9saWN5JyA6ICdub25lJ1xuXG5cdEAkZGF0YURmZCA6IG51bGxcblx0QGxvYWRlZCAgIDogZmFsc2VcblxuXHRAbG9hZCA6ID0+XG5cblx0XHQjIyNcblx0XHRUTyBET1xuXHRcdGluY2x1ZGUgc2NyaXB0IGxvYWRlciB3aXRoIGNhbGxiYWNrIHRvIDppbml0XG5cdFx0IyMjXG5cdFx0IyByZXF1aXJlIFtAdXJsXSwgQGluaXRcblxuXHRcdG51bGxcblxuXHRAaW5pdCA6ID0+XG5cblx0XHRAbG9hZGVkID0gdHJ1ZVxuXG5cdFx0QHBhcmFtc1snY2xpZW50aWQnXSA9IHdpbmRvdy5jb25maWcuZ3BfYXBwX2lkXG5cdFx0QHBhcmFtc1snY2FsbGJhY2snXSA9IEBsb2dpbkNhbGxiYWNrXG5cblx0XHRudWxsXG5cblx0QGxvZ2luIDogKEAkZGF0YURmZCkgPT5cblxuXHRcdGlmIEBsb2FkZWRcblx0XHRcdGdhcGkuYXV0aC5zaWduSW4gQHBhcmFtc1xuXHRcdGVsc2Vcblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ1NESyBub3QgbG9hZGVkJ1xuXG5cdFx0bnVsbFxuXG5cdEBsb2dpbkNhbGxiYWNrIDogKHJlcykgPT5cblxuXHRcdGlmIHJlc1snc3RhdHVzJ11bJ3NpZ25lZF9pbiddXG5cdFx0XHRAZ2V0VXNlckRhdGEgcmVzWydhY2Nlc3NfdG9rZW4nXVxuXHRcdGVsc2UgaWYgcmVzWydlcnJvciddWydhY2Nlc3NfZGVuaWVkJ11cblx0XHRcdEAkZGF0YURmZC5yZWplY3QgJ25vIHdheSBqb3NlJ1xuXG5cdFx0bnVsbFxuXG5cdEBnZXRVc2VyRGF0YSA6ICh0b2tlbikgPT5cblxuXHRcdGdhcGkuY2xpZW50LmxvYWQgJ3BsdXMnLCd2MScsID0+XG5cblx0XHRcdHJlcXVlc3QgPSBnYXBpLmNsaWVudC5wbHVzLnBlb3BsZS5nZXQgJ3VzZXJJZCc6ICdtZSdcblx0XHRcdHJlcXVlc3QuZXhlY3V0ZSAocmVzKSA9PlxuXG5cdFx0XHRcdHVzZXJEYXRhID1cblx0XHRcdFx0XHRhY2Nlc3NfdG9rZW4gOiB0b2tlblxuXHRcdFx0XHRcdGZ1bGxfbmFtZSAgICA6IHJlcy5kaXNwbGF5TmFtZVxuXHRcdFx0XHRcdHNvY2lhbF9pZCAgICA6IHJlcy5pZFxuXHRcdFx0XHRcdGVtYWlsICAgICAgICA6IGlmIHJlcy5lbWFpbHNbMF0gdGhlbiByZXMuZW1haWxzWzBdLnZhbHVlIGVsc2UgZmFsc2Vcblx0XHRcdFx0XHRwcm9maWxlX3BpYyAgOiByZXMuaW1hZ2UudXJsXG5cblx0XHRcdFx0QCRkYXRhRGZkLnJlc29sdmUgdXNlckRhdGFcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVQbHVzXG4iLCIjICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jICAgTWVkaWEgUXVlcmllcyBNYW5hZ2VyIFxuIyAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyAgIFxuIyAgIEBhdXRob3IgOiBGw6FiaW8gQXpldmVkbyA8ZmFiaW8uYXpldmVkb0B1bml0OS5jb20+IFVOSVQ5XG4jICAgQGRhdGUgICA6IFNlcHRlbWJlciAxNFxuIyAgIFxuIyAgIEluc3RydWN0aW9ucyBhcmUgb24gL3Byb2plY3Qvc2Fzcy91dGlscy9fcmVzcG9uc2l2ZS5zY3NzLlxuXG5jbGFzcyBNZWRpYVF1ZXJpZXNcblxuICAgICMgQnJlYWtwb2ludHNcbiAgICBAU01BTEwgICAgICAgOiBcInNtYWxsXCJcbiAgICBASVBBRCAgICAgICAgOiBcImlwYWRcIlxuICAgIEBNRURJVU0gICAgICA6IFwibWVkaXVtXCJcbiAgICBATEFSR0UgICAgICAgOiBcImxhcmdlXCJcbiAgICBARVhUUkFfTEFSR0UgOiBcImV4dHJhLWxhcmdlXCJcblxuICAgIEBzZXR1cCA6ID0+XG5cbiAgICAgICAgTWVkaWFRdWVyaWVzLlNNQUxMX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiU21hbGxcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuU01BTExdfVxuICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlQgPSB7bmFtZTogXCJNZWRpdW1cIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuTUVESVVNXX1cbiAgICAgICAgTWVkaWFRdWVyaWVzLkxBUkdFX0JSRUFLUE9JTlQgID0ge25hbWU6IFwiTGFyZ2VcIiwgYnJlYWtwb2ludHM6IFtNZWRpYVF1ZXJpZXMuSVBBRCwgTWVkaWFRdWVyaWVzLkxBUkdFLCBNZWRpYVF1ZXJpZXMuRVhUUkFfTEFSR0VdfVxuXG4gICAgICAgIE1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUyA9IFtcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5TTUFMTF9CUkVBS1BPSU5UXG4gICAgICAgICAgICBNZWRpYVF1ZXJpZXMuTUVESVVNX0JSRUFLUE9JTlRcbiAgICAgICAgICAgIE1lZGlhUXVlcmllcy5MQVJHRV9CUkVBS1BPSU5UXG4gICAgICAgIF1cbiAgICAgICAgcmV0dXJuXG5cbiAgICBAZ2V0RGV2aWNlU3RhdGUgOiA9PlxuXG4gICAgICAgIHJldHVybiB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5LCBcImFmdGVyXCIpLmdldFByb3BlcnR5VmFsdWUoXCJjb250ZW50XCIpO1xuXG4gICAgQGdldEJyZWFrcG9pbnQgOiA9PlxuXG4gICAgICAgIHN0YXRlID0gTWVkaWFRdWVyaWVzLmdldERldmljZVN0YXRlKClcblxuICAgICAgICBmb3IgaSBpbiBbMC4uLk1lZGlhUXVlcmllcy5CUkVBS1BPSU5UUy5sZW5ndGhdXG4gICAgICAgICAgICBpZiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0uYnJlYWtwb2ludHMuaW5kZXhPZihzdGF0ZSkgPiAtMVxuICAgICAgICAgICAgICAgIHJldHVybiBNZWRpYVF1ZXJpZXMuQlJFQUtQT0lOVFNbaV0ubmFtZVxuXG4gICAgICAgIHJldHVybiBcIlwiXG5cbiAgICBAaXNCcmVha3BvaW50IDogKGJyZWFrcG9pbnQpID0+XG5cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5icmVha3BvaW50LmJyZWFrcG9pbnRzLmxlbmd0aF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYnJlYWtwb2ludC5icmVha3BvaW50c1tpXSA9PSBNZWRpYVF1ZXJpZXMuZ2V0RGV2aWNlU3RhdGUoKVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXG5cbiAgICAgICAgcmV0dXJuIGZhbHNlXG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFRdWVyaWVzIiwiIyMjXG4jIFJlcXVlc3RlciAjXG5cbldyYXBwZXIgZm9yIGAkLmFqYXhgIGNhbGxzXG5cbiMjI1xuY2xhc3MgUmVxdWVzdGVyXG5cbiAgICBAcmVxdWVzdHMgOiBbXVxuXG4gICAgQHJlcXVlc3Q6ICggZGF0YSApID0+XG4gICAgICAgICMjI1xuICAgICAgICBgZGF0YSA9IHtgPGJyPlxuICAgICAgICBgICB1cmwgICAgICAgICA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGAgIHR5cGUgICAgICAgIDogXCJQT1NUL0dFVC9QVVRcImA8YnI+XG4gICAgICAgIGAgIGRhdGEgICAgICAgIDogT2JqZWN0YDxicj5cbiAgICAgICAgYCAgZGF0YVR5cGUgICAgOiBqUXVlcnkgZGF0YVR5cGVgPGJyPlxuICAgICAgICBgICBjb250ZW50VHlwZSA6IFN0cmluZ2A8YnI+XG4gICAgICAgIGB9YFxuICAgICAgICAjIyNcblxuICAgICAgICByID0gJC5hamF4IHtcblxuICAgICAgICAgICAgdXJsICAgICAgICAgOiBkYXRhLnVybFxuICAgICAgICAgICAgdHlwZSAgICAgICAgOiBpZiBkYXRhLnR5cGUgdGhlbiBkYXRhLnR5cGUgZWxzZSBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGEgICAgICAgIDogaWYgZGF0YS5kYXRhIHRoZW4gZGF0YS5kYXRhIGVsc2UgbnVsbCxcbiAgICAgICAgICAgIGRhdGFUeXBlICAgIDogaWYgZGF0YS5kYXRhVHlwZSB0aGVuIGRhdGEuZGF0YVR5cGUgZWxzZSBcImpzb25cIixcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlIDogaWYgZGF0YS5jb250ZW50VHlwZSB0aGVuIGRhdGEuY29udGVudFR5cGUgZWxzZSBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLFxuICAgICAgICAgICAgcHJvY2Vzc0RhdGEgOiBpZiBkYXRhLnByb2Nlc3NEYXRhICE9IG51bGwgYW5kIGRhdGEucHJvY2Vzc0RhdGEgIT0gdW5kZWZpbmVkIHRoZW4gZGF0YS5wcm9jZXNzRGF0YSBlbHNlIHRydWVcblxuICAgICAgICB9XG5cbiAgICAgICAgci5kb25lIGRhdGEuZG9uZVxuICAgICAgICByLmZhaWwgZGF0YS5mYWlsXG4gICAgICAgIFxuICAgICAgICByXG5cbiAgICBAYWRkSW1hZ2UgOiAoZGF0YSwgZG9uZSwgZmFpbCkgPT5cbiAgICAgICAgIyMjXG4gICAgICAgICoqIFVzYWdlOiA8YnI+XG4gICAgICAgIGBkYXRhID0gY2FudmFzcy50b0RhdGFVUkwoXCJpbWFnZS9qcGVnXCIpLnNsaWNlKFwiZGF0YTppbWFnZS9qcGVnO2Jhc2U2NCxcIi5sZW5ndGgpYDxicj5cbiAgICAgICAgYFJlcXVlc3Rlci5hZGRJbWFnZSBkYXRhLCBcInpvZXRyb3BlXCIsIEBkb25lLCBAZmFpbGBcbiAgICAgICAgIyMjXG5cbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nXG4gICAgICAgICAgICB0eXBlICAgOiAnUE9TVCdcbiAgICAgICAgICAgIGRhdGEgICA6IHtpbWFnZV9iYXNlNjQgOiBlbmNvZGVVUkkoZGF0YSl9XG4gICAgICAgICAgICBkb25lICAgOiBkb25lXG4gICAgICAgICAgICBmYWlsICAgOiBmYWlsXG5cbiAgICAgICAgbnVsbFxuXG4gICAgQGRlbGV0ZUltYWdlIDogKGlkLCBkb25lLCBmYWlsKSA9PlxuICAgICAgICBcbiAgICAgICAgQHJlcXVlc3RcbiAgICAgICAgICAgIHVybCAgICA6ICcvYXBpL2ltYWdlcy8nK2lkXG4gICAgICAgICAgICB0eXBlICAgOiAnREVMRVRFJ1xuICAgICAgICAgICAgZG9uZSAgIDogZG9uZVxuICAgICAgICAgICAgZmFpbCAgIDogZmFpbFxuXG4gICAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0ZXJcbiIsIiMjI1xuU2hhcmluZyBjbGFzcyBmb3Igbm9uLVNESyBsb2FkZWQgc29jaWFsIG5ldHdvcmtzLlxuSWYgU0RLIGlzIGxvYWRlZCwgYW5kIHByb3ZpZGVzIHNoYXJlIG1ldGhvZHMsIHRoZW4gdXNlIHRoYXQgY2xhc3MgaW5zdGVhZCwgZWcuIGBGYWNlYm9vay5zaGFyZWAgaW5zdGVhZCBvZiBgU2hhcmUuZmFjZWJvb2tgXG4jIyNcbmNsYXNzIFNoYXJlXG5cbiAgICB1cmwgOiBudWxsXG5cbiAgICBjb25zdHJ1Y3RvciA6IC0+XG5cbiAgICAgICAgQHVybCA9IEBDRCgpLkJBU0VfUEFUSFxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbiAgICBvcGVuV2luIDogKHVybCwgdywgaCkgPT5cblxuICAgICAgICBsZWZ0ID0gKCBzY3JlZW4uYXZhaWxXaWR0aCAgLSB3ICkgPj4gMVxuICAgICAgICB0b3AgID0gKCBzY3JlZW4uYXZhaWxIZWlnaHQgLSBoICkgPj4gMVxuXG4gICAgICAgIHdpbmRvdy5vcGVuIHVybCwgJycsICd0b3A9Jyt0b3ArJyxsZWZ0PScrbGVmdCsnLHdpZHRoPScrdysnLGhlaWdodD0nK2grJyxsb2NhdGlvbj1ubyxtZW51YmFyPW5vJ1xuXG4gICAgICAgIG51bGxcblxuICAgIHBsdXMgOiAoIHVybCApID0+XG5cbiAgICAgICAgdXJsID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cHM6Ly9wbHVzLmdvb2dsZS5jb20vc2hhcmU/dXJsPSN7dXJsfVwiLCA2NTAsIDM4NVxuXG4gICAgICAgIG51bGxcblxuICAgIHBpbnRlcmVzdCA6ICh1cmwsIG1lZGlhLCBkZXNjcikgPT5cblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgbWVkaWEgPSBlbmNvZGVVUklDb21wb25lbnQobWVkaWEpXG4gICAgICAgIGRlc2NyID0gZW5jb2RlVVJJQ29tcG9uZW50KGRlc2NyKVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3d3dy5waW50ZXJlc3QuY29tL3Bpbi9jcmVhdGUvYnV0dG9uLz91cmw9I3t1cmx9Jm1lZGlhPSN7bWVkaWF9JmRlc2NyaXB0aW9uPSN7ZGVzY3J9XCIsIDczNSwgMzEwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHVtYmxyIDogKHVybCwgbWVkaWEsIGRlc2NyKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBtZWRpYSA9IGVuY29kZVVSSUNvbXBvbmVudChtZWRpYSlcbiAgICAgICAgZGVzY3IgPSBlbmNvZGVVUklDb21wb25lbnQoZGVzY3IpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vd3d3LnR1bWJsci5jb20vc2hhcmUvcGhvdG8/c291cmNlPSN7bWVkaWF9JmNhcHRpb249I3tkZXNjcn0mY2xpY2tfdGhydT0je3VybH1cIiwgNDUwLCA0MzBcblxuICAgICAgICBudWxsXG5cbiAgICBmYWNlYm9vayA6ICggdXJsICwgY29weSA9ICcnKSA9PiBcblxuICAgICAgICB1cmwgICA9IGVuY29kZVVSSUNvbXBvbmVudCh1cmwgb3IgQHVybClcbiAgICAgICAgZGVjc3IgPSBlbmNvZGVVUklDb21wb25lbnQoY29weSlcblxuICAgICAgICBAb3BlbldpbiBcImh0dHA6Ly93d3cuZmFjZWJvb2suY29tL3NoYXJlLnBocD91PSN7dXJsfSZ0PSN7ZGVjc3J9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgdHdpdHRlciA6ICggdXJsICwgY29weSA9ICcnKSA9PlxuXG4gICAgICAgIHVybCAgID0gZW5jb2RlVVJJQ29tcG9uZW50KHVybCBvciBAdXJsKVxuICAgICAgICBpZiBjb3B5IGlzICcnXG4gICAgICAgICAgICBjb3B5ID0gQENEKCkubG9jYWxlLmdldCAnc2VvX3R3aXR0ZXJfY2FyZF9kZXNjcmlwdGlvbidcbiAgICAgICAgICAgIFxuICAgICAgICBkZXNjciA9IGVuY29kZVVSSUNvbXBvbmVudChjb3B5KVxuXG4gICAgICAgIEBvcGVuV2luIFwiaHR0cDovL3R3aXR0ZXIuY29tL2ludGVudC90d2VldC8/dGV4dD0je2Rlc2NyfSZ1cmw9I3t1cmx9XCIsIDYwMCwgMzAwXG5cbiAgICAgICAgbnVsbFxuXG4gICAgcmVucmVuIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2hhcmUucmVucmVuLmNvbS9zaGFyZS9idXR0b25zaGFyZS5kbz9saW5rPVwiICsgdXJsLCA2MDAsIDMwMFxuXG4gICAgICAgIG51bGxcblxuICAgIHdlaWJvIDogKCB1cmwgKSA9PiBcblxuICAgICAgICB1cmwgPSBlbmNvZGVVUklDb21wb25lbnQodXJsIG9yIEB1cmwpXG5cbiAgICAgICAgQG9wZW5XaW4gXCJodHRwOi8vc2VydmljZS53ZWliby5jb20vc2hhcmUvc2hhcmUucGhwP3VybD0je3VybH0mbGFuZ3VhZ2U9emhfY25cIiwgNjAwLCAzMDBcblxuICAgICAgICBudWxsXG5cbiAgICBDRCA6ID0+XG5cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DRFxuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlXG4iLCJjbGFzcyBBYnN0cmFjdFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblx0ZWwgICAgICAgICAgIDogbnVsbFxuXHRpZCAgICAgICAgICAgOiBudWxsXG5cdGNoaWxkcmVuICAgICA6IG51bGxcblx0dGVtcGxhdGUgICAgIDogbnVsbFxuXHR0ZW1wbGF0ZVZhcnMgOiBudWxsXG5cdFxuXHRpbml0aWFsaXplIDogLT5cblx0XHRcblx0XHRAY2hpbGRyZW4gPSBbXVxuXG5cdFx0aWYgQHRlbXBsYXRlXG5cdFx0XHR0bXBIVE1MID0gXy50ZW1wbGF0ZSBAQ0QoKS50ZW1wbGF0ZXMuZ2V0IEB0ZW1wbGF0ZVxuXHRcdFx0QHNldEVsZW1lbnQgdG1wSFRNTCBAdGVtcGxhdGVWYXJzXG5cblx0XHRAJGVsLmF0dHIgJ2lkJywgQGlkIGlmIEBpZFxuXHRcdEAkZWwuYWRkQ2xhc3MgQGNsYXNzTmFtZSBpZiBAY2xhc3NOYW1lXG5cdFx0XG5cdFx0QGluaXQoKVxuXG5cdFx0QHBhdXNlZCA9IGZhbHNlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRudWxsXG5cblx0dXBkYXRlIDogPT5cblxuXHRcdG51bGxcblxuXHRyZW5kZXIgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGFkZENoaWxkIDogKGNoaWxkLCBwcmVwZW5kID0gZmFsc2UpID0+XG5cblx0XHRAY2hpbGRyZW4ucHVzaCBjaGlsZCBpZiBjaGlsZC5lbFxuXHRcdHRhcmdldCA9IGlmIEBhZGRUb1NlbGVjdG9yIHRoZW4gQCRlbC5maW5kKEBhZGRUb1NlbGVjdG9yKS5lcSgwKSBlbHNlIEAkZWxcblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSBjaGlsZFxuXG5cdFx0aWYgIXByZXBlbmQgXG5cdFx0XHR0YXJnZXQuYXBwZW5kIGNcblx0XHRlbHNlIFxuXHRcdFx0dGFyZ2V0LnByZXBlbmQgY1xuXG5cdFx0QFxuXG5cdHJlcGxhY2UgOiAoZG9tLCBjaGlsZCkgPT5cblxuXHRcdEBjaGlsZHJlbi5wdXNoIGNoaWxkIGlmIGNoaWxkLmVsXG5cdFx0YyA9IGlmIGNoaWxkLmVsIHRoZW4gY2hpbGQuJGVsIGVsc2UgY2hpbGRcblx0XHRAJGVsLmNoaWxkcmVuKGRvbSkucmVwbGFjZVdpdGgoYylcblxuXHRcdG51bGxcblxuXHRyZW1vdmUgOiAoY2hpbGQpID0+XG5cblx0XHR1bmxlc3MgY2hpbGQ/XG5cdFx0XHRyZXR1cm5cblx0XHRcblx0XHRjID0gaWYgY2hpbGQuZWwgdGhlbiBjaGlsZC4kZWwgZWxzZSAkKGNoaWxkKVxuXHRcdGNoaWxkLmRpc3Bvc2UoKSBpZiBjIGFuZCBjaGlsZC5kaXNwb3NlXG5cblx0XHRpZiBjICYmIEBjaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPSAtMVxuXHRcdFx0QGNoaWxkcmVuLnNwbGljZSggQGNoaWxkcmVuLmluZGV4T2YoY2hpbGQpLCAxIClcblxuXHRcdGMucmVtb3ZlKClcblxuXHRcdG51bGxcblxuXHRvblJlc2l6ZSA6IChldmVudCkgPT5cblxuXHRcdChpZiBjaGlsZC5vblJlc2l6ZSB0aGVuIGNoaWxkLm9uUmVzaXplKCkpIGZvciBjaGlsZCBpbiBAY2hpbGRyZW5cblxuXHRcdG51bGxcblxuXHRtb3VzZUVuYWJsZWQgOiAoIGVuYWJsZWQgKSA9PlxuXG5cdFx0QCRlbC5jc3Ncblx0XHRcdFwicG9pbnRlci1ldmVudHNcIjogaWYgZW5hYmxlZCB0aGVuIFwiYXV0b1wiIGVsc2UgXCJub25lXCJcblxuXHRcdG51bGxcblxuXHRDU1NUcmFuc2xhdGUgOiAoeCwgeSwgdmFsdWU9JyUnLCBzY2FsZSkgPT5cblxuXHRcdGlmIE1vZGVybml6ci5jc3N0cmFuc2Zvcm1zM2Rcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlM2QoI3t4K3ZhbHVlfSwgI3t5K3ZhbHVlfSwgMClcIlxuXHRcdGVsc2Vcblx0XHRcdHN0ciA9IFwidHJhbnNsYXRlKCN7eCt2YWx1ZX0sICN7eSt2YWx1ZX0pXCJcblxuXHRcdGlmIHNjYWxlIHRoZW4gc3RyID0gXCIje3N0cn0gc2NhbGUoI3tzY2FsZX0pXCJcblxuXHRcdHN0clxuXG5cdHVuTXV0ZUFsbCA6ID0+XG5cblx0XHRmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnVuTXV0ZT8oKVxuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRjaGlsZC51bk11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdG11dGVBbGwgOiA9PlxuXG5cdFx0Zm9yIGNoaWxkIGluIEBjaGlsZHJlblxuXG5cdFx0XHRjaGlsZC5tdXRlPygpXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdGNoaWxkLm11dGVBbGwoKVxuXG5cdFx0bnVsbFxuXG5cdHJlbW92ZUFsbENoaWxkcmVuOiA9PlxuXG5cdFx0QHJlbW92ZSBjaGlsZCBmb3IgY2hpbGQgaW4gQGNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0dHJpZ2dlckNoaWxkcmVuIDogKG1zZywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkLnRyaWdnZXIgbXNnXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEB0cmlnZ2VyQ2hpbGRyZW4gbXNnLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbiA6IChtZXRob2QsIHBhcmFtcywgY2hpbGRyZW49QGNoaWxkcmVuKSA9PlxuXG5cdFx0Zm9yIGNoaWxkLCBpIGluIGNoaWxkcmVuXG5cblx0XHRcdGNoaWxkW21ldGhvZF0/IHBhcmFtc1xuXG5cdFx0XHRpZiBjaGlsZC5jaGlsZHJlbi5sZW5ndGhcblxuXHRcdFx0XHRAY2FsbENoaWxkcmVuIG1ldGhvZCwgcGFyYW1zLCBjaGlsZC5jaGlsZHJlblxuXG5cdFx0bnVsbFxuXG5cdGNhbGxDaGlsZHJlbkFuZFNlbGYgOiAobWV0aG9kLCBwYXJhbXMsIGNoaWxkcmVuPUBjaGlsZHJlbikgPT5cblxuXHRcdEBbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRmb3IgY2hpbGQsIGkgaW4gY2hpbGRyZW5cblxuXHRcdFx0Y2hpbGRbbWV0aG9kXT8gcGFyYW1zXG5cblx0XHRcdGlmIGNoaWxkLmNoaWxkcmVuLmxlbmd0aFxuXG5cdFx0XHRcdEBjYWxsQ2hpbGRyZW4gbWV0aG9kLCBwYXJhbXMsIGNoaWxkLmNoaWxkcmVuXG5cblx0XHRudWxsXG5cblx0c3VwcGxhbnRTdHJpbmcgOiAoc3RyLCB2YWxzKSAtPlxuXG5cdFx0cmV0dXJuIHN0ci5yZXBsYWNlIC97eyAoW157fV0qKSB9fS9nLCAoYSwgYikgLT5cblx0XHRcdHIgPSB2YWxzW2JdXG5cdFx0XHQoaWYgdHlwZW9mIHIgaXMgXCJzdHJpbmdcIiBvciB0eXBlb2YgciBpcyBcIm51bWJlclwiIHRoZW4gciBlbHNlIGEpXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHQjIyNcblx0XHRvdmVycmlkZSBvbiBwZXIgdmlldyBiYXNpcyAtIHVuYmluZCBldmVudCBoYW5kbGVycyBldGNcblx0XHQjIyNcblxuXHRcdG51bGxcblxuXHRDRCA6ID0+XG5cblx0XHRyZXR1cm4gd2luZG93LkNEXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RWaWV3UGFnZSBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdF9zaG93biAgICAgOiBmYWxzZVxuXHRfbGlzdGVuaW5nIDogZmFsc2VcblxuXHRzaG93IDogKGNiKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyAhQF9zaG93blxuXHRcdEBfc2hvd24gPSB0cnVlXG5cblx0XHQjIyNcblx0XHRDSEFOR0UgSEVSRSAtICdwYWdlJyB2aWV3cyBhcmUgYWx3YXlzIGluIERPTSAtIHRvIHNhdmUgaGF2aW5nIHRvIHJlLWluaXRpYWxpc2UgZ21hcCBldmVudHMgKFBJVEEpLiBObyBsb25nZXIgcmVxdWlyZSA6ZGlzcG9zZSBtZXRob2Rcblx0XHQjIyNcblx0XHRAQ0QoKS5hcHBWaWV3LndyYXBwZXIuYWRkQ2hpbGQgQFxuXHRcdEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb24nXG5cblx0XHQjIyMgcmVwbGFjZSB3aXRoIHNvbWUgcHJvcGVyIHRyYW5zaXRpb24gaWYgd2UgY2FuICMjI1xuXHRcdEAkZWwuY3NzICd2aXNpYmlsaXR5JyA6ICd2aXNpYmxlJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0aGlkZSA6IChjYikgPT5cblxuXHRcdHJldHVybiB1bmxlc3MgQF9zaG93blxuXHRcdEBfc2hvd24gPSBmYWxzZVxuXG5cdFx0IyMjXG5cdFx0Q0hBTkdFIEhFUkUgLSAncGFnZScgdmlld3MgYXJlIGFsd2F5cyBpbiBET00gLSB0byBzYXZlIGhhdmluZyB0byByZS1pbml0aWFsaXNlIGdtYXAgZXZlbnRzIChQSVRBKS4gTm8gbG9uZ2VyIHJlcXVpcmUgOmRpc3Bvc2UgbWV0aG9kXG5cdFx0IyMjXG5cdFx0QENEKCkuYXBwVmlldy53cmFwcGVyLnJlbW92ZSBAXG5cblx0XHQjIEBjYWxsQ2hpbGRyZW5BbmRTZWxmICdzZXRMaXN0ZW5lcnMnLCAnb2ZmJ1xuXG5cdFx0IyMjIHJlcGxhY2Ugd2l0aCBzb21lIHByb3BlciB0cmFuc2l0aW9uIGlmIHdlIGNhbiAjIyNcblx0XHRAJGVsLmNzcyAndmlzaWJpbGl0eScgOiAnaGlkZGVuJ1xuXHRcdGNiPygpXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAY2FsbENoaWxkcmVuQW5kU2VsZiAnc2V0TGlzdGVuZXJzJywgJ29mZidcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHJldHVybiB1bmxlc3Mgc2V0dGluZyBpc250IEBfbGlzdGVuaW5nXG5cdFx0QF9saXN0ZW5pbmcgPSBzZXR0aW5nXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQWJzdHJhY3RWaWV3UGFnZVxuIiwiQWJzdHJhY3RWaWV3UGFnZSA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0Vmlld1BhZ2UnXG5cbmNsYXNzIEFib3V0UGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1hYm91dCdcblxuXHRjb25zdHJ1Y3RvciA6IC0+XG5cblx0XHRAdGVtcGxhdGVWYXJzID0gXG5cdFx0XHRkZXNjIDogQENEKCkubG9jYWxlLmdldCBcImFib3V0X2Rlc2NcIlxuXG5cdFx0IyMjXG5cblx0XHRpbnN0YW50aWF0ZSBjbGFzc2VzIGhlcmVcblxuXHRcdEBleGFtcGxlQ2xhc3MgPSBuZXcgZXhhbXBsZUNsYXNzXG5cblx0XHQjIyNcblxuXHRcdHN1cGVyKClcblxuXHRcdCMjI1xuXG5cdFx0YWRkIGNsYXNzZXMgdG8gYXBwIHN0cnVjdHVyZSBoZXJlXG5cblx0XHRAXG5cdFx0XHQuYWRkQ2hpbGQoQGV4YW1wbGVDbGFzcylcblxuXHRcdCMjI1xuXG5cdFx0cmV0dXJuIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYm91dFBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEZvb3RlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG4gICAgdGVtcGxhdGUgOiAnc2l0ZS1mb290ZXInXG5cbiAgICBjb25zdHJ1Y3RvcjogLT5cblxuICAgICAgICBAdGVtcGxhdGVWYXJzID0gXG4gICAgICAgIFx0ZGVzYyA6IEBDRCgpLmxvY2FsZS5nZXQgXCJmb290ZXJfZGVzY1wiXG5cbiAgICAgICAgc3VwZXIoKVxuXG4gICAgICAgIHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gRm9vdGVyXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIEhlYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdHRlbXBsYXRlIDogJ3NpdGUtaGVhZGVyJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPVxuXHRcdFx0ZGVzYyAgICA6IEBDRCgpLmxvY2FsZS5nZXQgXCJoZWFkZXJfZGVzY1wiXG5cdFx0XHRob21lICAgIDogXG5cdFx0XHRcdGxhYmVsICAgIDogJ0dvIHRvIGhvbWVwYWdlJ1xuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfUEFUSCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5IT01FXG5cdFx0XHRhYm91dCA6IFxuXHRcdFx0XHRsYWJlbCAgICA6ICdHbyB0byBhYm91dCBwYWdlJ1xuXHRcdFx0XHR1cmwgICAgICA6IEBDRCgpLkJBU0VfUEFUSCArICcvJyArIEBDRCgpLm5hdi5zZWN0aW9ucy5BQk9VVFxuXHRcdFx0Y29udHJpYnV0ZSA6IFxuXHRcdFx0XHRsYWJlbCAgICA6ICdHbyB0byBjb250cmlidXRlIHBhZ2UnXG5cdFx0XHRcdHVybCAgICAgIDogQENEKCkuQkFTRV9QQVRIICsgJy8nICsgQENEKCkubmF2LnNlY3Rpb25zLkNPTlRSSUJVVEVcblxuXHRcdHN1cGVyKClcblxuXHRcdHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyXG4iLCJBYnN0cmFjdFZpZXcgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXcnXG5cbmNsYXNzIFByZWxvYWRlciBleHRlbmRzIEFic3RyYWN0Vmlld1xuXHRcblx0Y2IgICAgICAgICAgICAgIDogbnVsbFxuXHRcblx0VFJBTlNJVElPTl9USU1FIDogMC41XG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHNldEVsZW1lbnQgJCgnI3ByZWxvYWRlcicpXG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdHNob3cgOiAoQGNiKSA9PlxuXG5cdFx0QCRlbC5jc3MgJ2Rpc3BsYXknIDogJ2Jsb2NrJ1xuXG5cdFx0bnVsbFxuXG5cdG9uU2hvd0NvbXBsZXRlIDogPT5cblxuXHRcdEBjYj8oKVxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoQGNiKSA9PlxuXG5cdFx0QG9uSGlkZUNvbXBsZXRlKClcblxuXHRcdG51bGxcblxuXHRvbkhpZGVDb21wbGV0ZSA6ID0+XG5cblx0XHRAJGVsLmNzcyAnZGlzcGxheScgOiAnbm9uZSdcblx0XHRAY2I/KClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBQcmVsb2FkZXJcbiIsIkFic3RyYWN0VmlldyAgICAgICA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcbkhvbWVWaWV3ICAgICAgICAgICA9IHJlcXVpcmUgJy4uL2hvbWUvSG9tZVZpZXcnXG5BYm91dFBhZ2VWaWV3ICAgICAgPSByZXF1aXJlICcuLi9hYm91dFBhZ2UvQWJvdXRQYWdlVmlldydcbkNvbnRyaWJ1dGVQYWdlVmlldyA9IHJlcXVpcmUgJy4uL2NvbnRyaWJ1dGVQYWdlL0NvbnRyaWJ1dGVQYWdlVmlldydcbk5hdiAgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4uLy4uL3JvdXRlci9OYXYnXG5cbmNsYXNzIFdyYXBwZXIgZXh0ZW5kcyBBYnN0cmFjdFZpZXdcblxuXHRWSUVXX1RZUEVfUEFHRSAgOiAncGFnZSdcblx0VklFV19UWVBFX01PREFMIDogJ21vZGFsJ1xuXG5cdHRlbXBsYXRlIDogJ3dyYXBwZXInXG5cblx0dmlld3MgICAgICAgICAgOiBudWxsXG5cdHByZXZpb3VzVmlldyAgIDogbnVsbFxuXHRjdXJyZW50VmlldyAgICA6IG51bGxcblx0YmFja2dyb3VuZFZpZXcgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0QHZpZXdzID1cblx0XHRcdGhvbWUgICAgICAgOiBjbGFzc1JlZiA6IEhvbWVWaWV3LCAgICAgICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuSE9NRSwgICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGFib3V0ICAgICAgOiBjbGFzc1JlZiA6IEFib3V0UGFnZVZpZXcsICAgICAgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQUJPVVQsICAgICAgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0Vcblx0XHRcdGNvbnRyaWJ1dGUgOiBjbGFzc1JlZiA6IENvbnRyaWJ1dGVQYWdlVmlldywgcm91dGUgOiBAQ0QoKS5uYXYuc2VjdGlvbnMuQ09OVFJJQlVURSwgdmlldyA6IG51bGwsIHR5cGUgOiBAVklFV19UWVBFX1BBR0VcblxuXHRcdEBjcmVhdGVDbGFzc2VzKClcblxuXHRcdHN1cGVyKClcblxuXHRcdCMgZGVjaWRlIGlmIHlvdSB3YW50IHRvIGFkZCBhbGwgY29yZSBET00gdXAgZnJvbnQsIG9yIGFkZCBvbmx5IHdoZW4gcmVxdWlyZWQsIHNlZSBjb21tZW50cyBpbiBBYnN0cmFjdFZpZXdQYWdlLmNvZmZlZVxuXHRcdCMgQGFkZENsYXNzZXMoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRjcmVhdGVDbGFzc2VzIDogPT5cblxuXHRcdChAdmlld3NbbmFtZV0udmlldyA9IG5ldyBAdmlld3NbbmFtZV0uY2xhc3NSZWYpIGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXG5cdFx0bnVsbFxuXG5cdGFkZENsYXNzZXMgOiA9PlxuXG5cdFx0IGZvciBuYW1lLCBkYXRhIG9mIEB2aWV3c1xuXHRcdCBcdGlmIGRhdGEudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgdGhlbiBAYWRkQ2hpbGQgZGF0YS52aWV3XG5cblx0XHRudWxsXG5cblx0Z2V0Vmlld0J5Um91dGUgOiAocm91dGUpID0+XG5cblx0XHRmb3IgbmFtZSwgZGF0YSBvZiBAdmlld3Ncblx0XHRcdHJldHVybiBAdmlld3NbbmFtZV0gaWYgcm91dGUgaXMgQHZpZXdzW25hbWVdLnJvdXRlXG5cblx0XHRudWxsXG5cblx0aW5pdCA6ID0+XG5cblx0XHRAQ0QoKS5hcHBWaWV3Lm9uICdzdGFydCcsIEBzdGFydFxuXG5cdFx0bnVsbFxuXG5cdHN0YXJ0IDogPT5cblxuXHRcdEBDRCgpLmFwcFZpZXcub2ZmICdzdGFydCcsIEBzdGFydFxuXG5cdFx0QGJpbmRFdmVudHMoKVxuXG5cdFx0bnVsbFxuXG5cdGJpbmRFdmVudHMgOiA9PlxuXG5cdFx0QENEKCkubmF2Lm9uIE5hdi5FVkVOVF9DSEFOR0VfVklFVywgQGNoYW5nZVZpZXdcblx0XHRAQ0QoKS5uYXYub24gTmF2LkVWRU5UX0NIQU5HRV9TVUJfVklFVywgQGNoYW5nZVN1YlZpZXdcblxuXHRcdG51bGxcblxuXHQjIyNcblxuXHRUSElTIElTIEEgTUVTUywgU09SVCBJVCAobmVpbClcblxuXHQjIyNcblx0Y2hhbmdlVmlldyA6IChwcmV2aW91cywgY3VycmVudCkgPT5cblxuXHRcdEBwcmV2aW91c1ZpZXcgPSBAZ2V0Vmlld0J5Um91dGUgcHJldmlvdXMuYXJlYVxuXHRcdEBjdXJyZW50VmlldyAgPSBAZ2V0Vmlld0J5Um91dGUgY3VycmVudC5hcmVhXG5cblx0XHRpZiAhQHByZXZpb3VzVmlld1xuXG5cdFx0XHRpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX1BBR0Vcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBmYWxzZSwgQGN1cnJlbnRWaWV3LnZpZXdcblx0XHRcdGVsc2UgaWYgQGN1cnJlbnRWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTFxuXHRcdFx0XHRAYmFja2dyb3VuZFZpZXcgPSBAdmlld3MuaG9tZVxuXHRcdFx0XHRAdHJhbnNpdGlvblZpZXdzIGZhbHNlLCBAY3VycmVudFZpZXcudmlldywgdHJ1ZVxuXG5cdFx0ZWxzZVxuXG5cdFx0XHRpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgYW5kIEBwcmV2aW91c1ZpZXcudHlwZSBpcyBAVklFV19UWVBFX1BBR0Vcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LnZpZXcsIEBjdXJyZW50Vmlldy52aWV3XG5cdFx0XHRlbHNlIGlmIEBjdXJyZW50Vmlldy50eXBlIGlzIEBWSUVXX1RZUEVfTU9EQUwgYW5kIEBwcmV2aW91c1ZpZXcudHlwZSBpcyBAVklFV19UWVBFX1BBR0Vcblx0XHRcdFx0QGJhY2tncm91bmRWaWV3ID0gQHByZXZpb3VzVmlld1xuXHRcdFx0XHRAdHJhbnNpdGlvblZpZXdzIGZhbHNlLCBAY3VycmVudFZpZXcudmlldywgdHJ1ZVxuXHRcdFx0ZWxzZSBpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX1BBR0UgYW5kIEBwcmV2aW91c1ZpZXcudHlwZSBpcyBAVklFV19UWVBFX01PREFMXG5cdFx0XHRcdEBiYWNrZ3JvdW5kVmlldyA9IEBiYWNrZ3JvdW5kVmlldyBvciBAdmlld3MuaG9tZVxuXHRcdFx0XHRpZiBAYmFja2dyb3VuZFZpZXcgaXNudCBAY3VycmVudFZpZXdcblx0XHRcdFx0XHRAdHJhbnNpdGlvblZpZXdzIEBwcmV2aW91c1ZpZXcudmlldywgQGN1cnJlbnRWaWV3LnZpZXcsIGZhbHNlLCB0cnVlXG5cdFx0XHRcdGVsc2UgaWYgQGJhY2tncm91bmRWaWV3IGlzIEBjdXJyZW50Vmlld1xuXHRcdFx0XHRcdEB0cmFuc2l0aW9uVmlld3MgQHByZXZpb3VzVmlldy52aWV3LCBmYWxzZVxuXHRcdFx0ZWxzZSBpZiBAY3VycmVudFZpZXcudHlwZSBpcyBAVklFV19UWVBFX01PREFMIGFuZCBAcHJldmlvdXNWaWV3LnR5cGUgaXMgQFZJRVdfVFlQRV9NT0RBTFxuXHRcdFx0XHRAYmFja2dyb3VuZFZpZXcgPSBAYmFja2dyb3VuZFZpZXcgb3IgQHZpZXdzLmhvbWVcblx0XHRcdFx0QHRyYW5zaXRpb25WaWV3cyBAcHJldmlvdXNWaWV3LnZpZXcsIEBjdXJyZW50Vmlldy52aWV3LCB0cnVlXG5cblx0XHRudWxsXG5cblx0Y2hhbmdlU3ViVmlldyA6IChjdXJyZW50KSA9PlxuXG5cdFx0QGN1cnJlbnRWaWV3LnZpZXcudHJpZ2dlciBOYXYuRVZFTlRfQ0hBTkdFX1NVQl9WSUVXLCBjdXJyZW50LnN1YlxuXG5cdFx0bnVsbFxuXG5cdHRyYW5zaXRpb25WaWV3cyA6IChmcm9tLCB0bywgdG9Nb2RhbD1mYWxzZSwgZnJvbU1vZGFsPWZhbHNlKSA9PlxuXG5cdFx0cmV0dXJuIHVubGVzcyBmcm9tIGlzbnQgdG9cblxuXHRcdGlmIHRvTW9kYWwgdGhlbiBAYmFja2dyb3VuZFZpZXcudmlldz8uc2hvdygpXG5cdFx0aWYgZnJvbU1vZGFsIHRoZW4gQGJhY2tncm91bmRWaWV3LnZpZXc/LmhpZGUoKVxuXG5cdFx0aWYgZnJvbSBhbmQgdG9cblx0XHRcdGZyb20uaGlkZSB0by5zaG93XG5cdFx0ZWxzZSBpZiBmcm9tXG5cdFx0XHRmcm9tLmhpZGUoKVxuXHRcdGVsc2UgaWYgdG9cblx0XHRcdHRvLnNob3coKVxuXG5cdFx0bnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXJcbiIsIkFic3RyYWN0Vmlld1BhZ2UgPSByZXF1aXJlICcuLi9BYnN0cmFjdFZpZXdQYWdlJ1xuXG5jbGFzcyBDb250cmlidXRlUGFnZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1jb250cmlidXRlJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiY29udHJpYnV0ZV9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IGV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJpYnV0ZVBhZ2VWaWV3XG4iLCJBYnN0cmFjdFZpZXdQYWdlID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3UGFnZSdcblxuY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBBYnN0cmFjdFZpZXdQYWdlXG5cblx0dGVtcGxhdGUgOiAncGFnZS1ob21lJ1xuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSBcblx0XHRcdGRlc2MgOiBAQ0QoKS5sb2NhbGUuZ2V0IFwiaG9tZV9kZXNjXCJcblxuXHRcdCMjI1xuXG5cdFx0aW5zdGFudGlhdGUgY2xhc3NlcyBoZXJlXG5cblx0XHRAZXhhbXBsZUNsYXNzID0gbmV3IEV4YW1wbGVDbGFzc1xuXG5cdFx0IyMjXG5cblx0XHRzdXBlcigpXG5cblx0XHQjIyNcblxuXHRcdGFkZCBjbGFzc2VzIHRvIGFwcCBzdHJ1Y3R1cmUgaGVyZVxuXG5cdFx0QFxuXHRcdFx0LmFkZENoaWxkKEBleGFtcGxlQ2xhc3MpXG5cblx0XHQjIyNcblxuXHRcdHJldHVybiBudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gSG9tZVZpZXdcbiIsIkFic3RyYWN0VmlldyA9IHJlcXVpcmUgJy4uL0Fic3RyYWN0VmlldydcblxuY2xhc3MgQWJzdHJhY3RNb2RhbCBleHRlbmRzIEFic3RyYWN0Vmlld1xuXG5cdCR3aW5kb3cgOiBudWxsXG5cblx0IyMjIG92ZXJyaWRlIGluIGluZGl2aWR1YWwgY2xhc3NlcyAjIyNcblx0bmFtZSAgICAgOiBudWxsXG5cdHRlbXBsYXRlIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogLT5cblxuXHRcdEAkd2luZG93ID0gJCh3aW5kb3cpXG5cblx0XHRzdXBlcigpXG5cblx0XHRAQ0QoKS5hcHBWaWV3LmFkZENoaWxkIEBcblx0XHRAc2V0TGlzdGVuZXJzICdvbidcblx0XHRAYW5pbWF0ZUluKClcblxuXHRcdHJldHVybiBudWxsXG5cblx0aGlkZSA6ID0+XG5cblx0XHRAYW5pbWF0ZU91dCA9PiBAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cblx0XHRudWxsXG5cblx0ZGlzcG9zZSA6ID0+XG5cblx0XHRAc2V0TGlzdGVuZXJzICdvZmYnXG5cdFx0QENEKCkuYXBwVmlldy5tb2RhbE1hbmFnZXIubW9kYWxzW0BuYW1lXS52aWV3ID0gbnVsbFxuXG5cdFx0bnVsbFxuXG5cdHNldExpc3RlbmVycyA6IChzZXR0aW5nKSA9PlxuXG5cdFx0QCR3aW5kb3dbc2V0dGluZ10gJ2tleXVwJywgQG9uS2V5VXBcblx0XHRAJCgnW2RhdGEtY2xvc2VdJylbc2V0dGluZ10gJ2NsaWNrJywgQGNsb3NlQ2xpY2tcblxuXHRcdG51bGxcblxuXHRvbktleVVwIDogKGUpID0+XG5cblx0XHRpZiBlLmtleUNvZGUgaXMgMjcgdGhlbiBAaGlkZSgpXG5cblx0XHRudWxsXG5cblx0YW5pbWF0ZUluIDogPT5cblxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLCAwLjMsIHsgJ3Zpc2liaWxpdHknOiAndmlzaWJsZScsICdvcGFjaXR5JzogMSwgZWFzZSA6IFF1YWQuZWFzZU91dCB9XG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwuZmluZCgnLmlubmVyJyksIDAuMywgeyBkZWxheSA6IDAuMTUsICd0cmFuc2Zvcm0nOiAnc2NhbGUoMSknLCAndmlzaWJpbGl0eSc6ICd2aXNpYmxlJywgJ29wYWNpdHknOiAxLCBlYXNlIDogQmFjay5lYXNlT3V0IH1cblxuXHRcdG51bGxcblxuXHRhbmltYXRlT3V0IDogKGNhbGxiYWNrKSA9PlxuXG5cdFx0VHdlZW5MaXRlLnRvIEAkZWwsIDAuMywgeyBkZWxheSA6IDAuMTUsICdvcGFjaXR5JzogMCwgZWFzZSA6IFF1YWQuZWFzZU91dCwgb25Db21wbGV0ZTogY2FsbGJhY2sgfVxuXHRcdFR3ZWVuTGl0ZS50byBAJGVsLmZpbmQoJy5pbm5lcicpLCAwLjMsIHsgJ3RyYW5zZm9ybSc6ICdzY2FsZSgwLjgpJywgJ29wYWNpdHknOiAwLCBlYXNlIDogQmFjay5lYXNlSW4gfVxuXG5cdFx0bnVsbFxuXG5cdGNsb3NlQ2xpY2s6ICggZSApID0+XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KClcblxuXHRcdEBoaWRlKClcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBYnN0cmFjdE1vZGFsXG4iLCJBYnN0cmFjdE1vZGFsID0gcmVxdWlyZSAnLi9BYnN0cmFjdE1vZGFsJ1xuXG5jbGFzcyBPcmllbnRhdGlvbk1vZGFsIGV4dGVuZHMgQWJzdHJhY3RNb2RhbFxuXG5cdG5hbWUgICAgIDogJ29yaWVudGF0aW9uTW9kYWwnXG5cdHRlbXBsYXRlIDogJ29yaWVudGF0aW9uLW1vZGFsJ1xuXG5cdGNiICAgICAgIDogbnVsbFxuXG5cdGNvbnN0cnVjdG9yIDogKEBjYikgLT5cblxuXHRcdEB0ZW1wbGF0ZVZhcnMgPSB7QG5hbWV9XG5cblx0XHRzdXBlcigpXG5cblx0XHRyZXR1cm4gbnVsbFxuXG5cdGluaXQgOiA9PlxuXG5cdFx0bnVsbFxuXG5cdGhpZGUgOiAoc3RpbGxMYW5kc2NhcGU9dHJ1ZSkgPT5cblxuXHRcdEBhbmltYXRlT3V0ID0+XG5cdFx0XHRAQ0QoKS5hcHBWaWV3LnJlbW92ZSBAXG5cdFx0XHRpZiAhc3RpbGxMYW5kc2NhcGUgdGhlbiBAY2I/KClcblxuXHRcdG51bGxcblxuXHRzZXRMaXN0ZW5lcnMgOiAoc2V0dGluZykgPT5cblxuXHRcdHN1cGVyXG5cblx0XHRAQ0QoKS5hcHBWaWV3W3NldHRpbmddICd1cGRhdGVEaW1zJywgQG9uVXBkYXRlRGltc1xuXHRcdEAkZWxbc2V0dGluZ10gJ3RvdWNoZW5kIGNsaWNrJywgQGhpZGVcblxuXHRcdG51bGxcblxuXHRvblVwZGF0ZURpbXMgOiAoZGltcykgPT5cblxuXHRcdGlmIGRpbXMubyBpcyAncG9ydHJhaXQnIHRoZW4gQGhpZGUgZmFsc2VcblxuXHRcdG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBPcmllbnRhdGlvbk1vZGFsXG4iLCJBYnN0cmFjdFZpZXcgICAgID0gcmVxdWlyZSAnLi4vQWJzdHJhY3RWaWV3J1xuT3JpZW50YXRpb25Nb2RhbCA9IHJlcXVpcmUgJy4vT3JpZW50YXRpb25Nb2RhbCdcblxuY2xhc3MgTW9kYWxNYW5hZ2VyIGV4dGVuZHMgQWJzdHJhY3RWaWV3XG5cblx0IyB3aGVuIG5ldyBtb2RhbCBjbGFzc2VzIGFyZSBjcmVhdGVkLCBhZGQgaGVyZSwgd2l0aCByZWZlcmVuY2UgdG8gY2xhc3MgbmFtZVxuXHRtb2RhbHMgOlxuXHRcdG9yaWVudGF0aW9uTW9kYWwgOiBjbGFzc1JlZiA6IE9yaWVudGF0aW9uTW9kYWwsIHZpZXcgOiBudWxsXG5cblx0Y29uc3RydWN0b3IgOiAtPlxuXG5cdFx0c3VwZXIoKVxuXG5cdFx0cmV0dXJuIG51bGxcblxuXHRpbml0IDogPT5cblxuXHRcdG51bGxcblxuXHRpc09wZW4gOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiByZXR1cm4gdHJ1ZSApIGZvciBuYW1lLCBtb2RhbCBvZiBAbW9kYWxzXG5cblx0XHRmYWxzZVxuXG5cdGhpZGVPcGVuTW9kYWwgOiA9PlxuXG5cdFx0KCBpZiBAbW9kYWxzW25hbWVdLnZpZXcgdGhlbiBvcGVuTW9kYWwgPSBAbW9kYWxzW25hbWVdLnZpZXcgKSBmb3IgbmFtZSwgbW9kYWwgb2YgQG1vZGFsc1xuXG5cdFx0b3Blbk1vZGFsPy5oaWRlKClcblxuXHRcdG51bGxcblxuXHRzaG93TW9kYWwgOiAobmFtZSwgY2I9bnVsbCkgPT5cblxuXHRcdHJldHVybiBpZiBAbW9kYWxzW25hbWVdLnZpZXdcblxuXHRcdEBtb2RhbHNbbmFtZV0udmlldyA9IG5ldyBAbW9kYWxzW25hbWVdLmNsYXNzUmVmIGNiXG5cblx0XHRudWxsXG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxNYW5hZ2VyXG4iXX0=
