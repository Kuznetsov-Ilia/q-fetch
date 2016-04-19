'use strict';

var body = document.body;
var window$1 = self || window;
var head = document.head || document.getElementsByTagName('head')[0];

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
function isEmpty(obj) {
  if (!isObject(obj)) {
    return false;
  }
  for (var i in obj) {
    return false;
  }
  return true;
}
if (!Array.isArray) {
  var op2str = Object.prototype.toString;
  Array.isArray = function(a) {
    return op2str.call(a) === '[object Array]';
  };
}
function isString(value) {
  return isset(value) && typeof value === 'string';
}
function isset(value) {
  return value !== undefined;
}
function rand() {
  return (Math.random() * 1e17).toString(36).replace('.', '');
}

function noop$2() {}


function _then(promise, method, callback) {
  return function () {
    var args = arguments, retVal;

    /* istanbul ignore else */
    if (typeof callback === 'function') {
      //try {
        retVal = callback.apply(promise, args);
      //} catch (err) {
        /*if (DEBUG) {
          console.error(err);
          throw err;
        }
        promise.reject(err);
        return;
      }*/

      if (retVal && typeof retVal.then === 'function') {
        if (retVal.done && retVal.fail) {
          retVal.done(promise.resolve).fail(promise.reject);
        }
        else {
          retVal.then(promise.resolve, promise.reject);
        }
        return;
      } else {
        args = [retVal];
        method = 'resolve';
      }
    }

    promise[method].apply(promise, args);
  };
}


/**
 * «Обещания» поддерживают как [нативный](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
 * интерфейс, так и [$.Deferred](http://api.jquery.com/category/deferred-object/).
 *
 * @class   Promise
 * @param   {Function}  [executor]
 * @returns {Promise}
 */

function Promise(executor, abort, progress) {
  var _completed = false;
  var _args;
  var _doneFn = [];
  var _failFn = [];
  var dfd = /** @lends Promise.prototype */ {
    /**
     * Добавляет обработчик, который будет вызван, когда «обещание» будет «разрешено»
     * @param  {Function}  fn  функция обработчик
     * @returns {Promise}
     */
    done: function (fn) {
      _doneFn.push(fn);
      return dfd;
    },

    /**
     * Добавляет обработчик, который будет вызван, когда «обещание» будет «отменено»
     * @param  {Function}  fn  функция обработчик
     * @returns {Promise}
     */
    fail: function (fn) {
      _failFn.push(fn);
      return dfd;
    },

    /**
     * Добавляет сразу два обработчика
     * @param   {Function}   [doneFn]   будет выполнено, когда «обещание» будет «разрешено»
     * @param   {Function}   [failFn]   или когда «обещание» будет «отменено»
     * @returns {Promise}
     */
    then: function (doneFn, failFn) {
      var promise = Promise();

      dfd
        .done(_then(promise, 'resolve', doneFn))
        .fail(_then(promise, 'reject', failFn))
      ;

      return promise;
    },

    notify: noop$2, // jQuery support
    abort: () => {
      _doneFn = [];
      _failFn = [];
      _completed = true;
    }, // jQuery support
    progress: progress || noop$2, // jQuery support
    promise: function () {
      // jQuery support
      return dfd;
    },

    /**
     * Событие по которому убиваем промис
     */
    ttl: ttl,


    /**
     * Добавить обработчик «обещаний» в независимости от выполнения
     * @param   {Function}   fn   функция обработчик
     * @returns {Promise}
     */
    always: function (fn) {
      return dfd.done(fn).fail(fn);
    },


    /**
     * «Разрешить» «обещание»
     * @method
     * @param    {*}  result
     * @returns  {Promise}
     */
    resolve: _setState(true),


    /**
     * «Отменить» «обещание»
     * @method
     * @param   {*}  result
     * @returns {Promise}
     */
    reject: _setState(false)
  };


  /**
   * @name  Promise#catch
   * @alias fail
   * @method
   */
  dfd['catch'] = function (fn) {
    return dfd.then(null, fn);
  };


  // Работеам как native Promises
  /* istanbul ignore else */
  if (typeof executor === 'function') {
    //try {
      executor(dfd.resolve, dfd.reject);
    //} catch (err) {
      /*if (DEBUG) {
        console.error(err);
        throw err;
      }*/
      /*dfd.reject(err);
    }*/
  }

  return dfd;

  function _setState(state) {

    return function () {
      if (_completed) {
        return dfd;
      }

      _args = arguments;
      _completed = true;

      // Затираем методы
      dfd.done =
      dfd.fail =
      dfd.resolve =
      dfd.reject = function () {
        return dfd;
      };

      dfd[state ? 'done' : 'fail'] = function (fn) {
        /* istanbul ignore else */
        if (typeof fn === 'function') {
          fn.apply(dfd, _args);
        }
        return dfd;
      };

      var fn,
        fns = state ? _doneFn : _failFn,
        i = 0,
        n = fns.length
      ;

      for (; i < n; i++) {
        fn = fns[i];
        /* istanbul ignore else */
        if (typeof fn === 'function') {
          fn.apply(dfd, _args);
        }
      }

      fns = _doneFn = _failFn = null;

      return dfd;
    };
  }
}

/**
 * Дождаться «разрешения» всех обещаний
 * @static
 * @memberOf Promise
 * @param    {Array} iterable  массив значений/обещаний
 * @returns  {Promise}
 */

Promise.all = function (iterable) {
  var dfd = Promise(),
    d,
    i = 0,
    n = iterable.length,
    remain = n,
    values = [],
    _fn,
    _doneFn = function (i, val) {
      (i >= 0) && (values[i] = val);

      /* istanbul ignore else */
      if (--remain <= 0) {
        dfd.resolve(values);
      }
    },
    _failFn = function (err) {
      dfd.reject([err]);
    }
  ;

  if (remain === 0) {
    _doneFn();
  }
  else {
    for (; i < n; i++) {
      d = iterable[i];

      if (d && typeof d.then === 'function') {
        _fn = _doneFn.bind(null, i); // todo: тест
        if (d.done && d.fail) {
          d.done(_fn).fail(_failFn);
        } else {
          d.then(_fn, _failFn);
        }
      }
      else {
        _doneFn(i, d);
      }
    }
  }

  return dfd;
};


/**
 * Дождаться «разрешения» всех обещаний и вернуть результат последнего
 * @static
 * @memberOf Promise
 * @param    {Array}   iterable   массив значений/обещаний
 * @returns  {Promise}
 */
Promise.race = function (iterable) {
  return Promise.all(iterable).then(function (values) {
    return values.pop();
  });
};


/**
 * Привести значение к «Обещанию»
 * @static
 * @memberOf Promise
 * @param    {*}   value    переменная или объект имеющий метод then
 * @returns  {Promise}
 */
Promise.cast = function (value) {
  var promise = Promise().resolve(value);
  return value && typeof value.then === 'function'
    ? promise.then(function () { return value; })
    : promise
  ;
};


/**
 * Вернуть «разрешенное» обещание
 * @static
 * @memberOf Promise
 * @param    {*}   value    переменная
 * @returns  {Promise}
 */
Promise.resolve = function (value) {
  return Promise().resolve(value);
};


/**
 * Вернуть «отклоненное» обещание
 * @static
 * @memberOf Promise
 * @param    {*}   value    переменная
 * @returns  {Promise}
 */
Promise.reject = function (value) {
  return Promise().reject(value);
};


/**
 * Дождаться «разрешения» всех обещаний
 * @param   {Object}  map «Ключь» => «Обещание»
 * @returns {Promise}
 */
Promise.map = function (map) {
  var array = [], key, idx = 0, results = {};

  for (key in map) {
    array.push(map[key]);
  }

  return Promise.all(array).then(function (values) {
    /* jshint -W088 */
    for (key in map) {
      results[key] = values[idx++];
    }

    return results;
  });
};

/*
  1. абортим xhr
  2. костылим View.prototype.add - помойка вызываемая при деструкторе вьюхи
  3. блокируем done/fail колбеки промиса
*/
function ttl(eventEmiter, eventName) {
  var _this = this;
  var XHR = this.XHR;
  if (eventName === 'remove' && XHR) {
    eventEmiter.add([{ remove }]);// View.prototype.add
  } else {
    eventEmiter.once(eventName, remove);
  }
  function remove() {
    _this.abort();
    if (XHR.status !== 200) {
      XHR.abort();
    }
  }
  return this;
}

const DEFAULT_TIMEOUT = 5000;
const DONE = 4;
var fetch;
if (window$1.fetch) {
  fetch = prepare(newfag);
} else {
  fetch = prepare(oldschool);
}

var fetch$1 = fetch;

function prepare(callback) {
  return function (method, url, data, options={}){
    method = method.toLowerCase();
    options = Object.assign({
      method: method,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json'
      }
    }, options);

    switch (method) {
    case 'jsonp':
      return jsonp(url, data, options);
    case 'get':
    case 'head':
    case 'delete':
      if (isString(data)) {
        var sign = url.indexOf('?') === -1 ? '?' : '&';
        url = url + sign + data;
      } else if (!isEmpty(data)) {
        url += '&' + Object.keys(data).map(encodeUrlParams(data)).join('&');
      }
      if ('body' in options) {
        delete options.body;
      }
      break;
    case 'post':
      options.credentials = 'include';
      if (!isEmpty(data) && !isNativeDataTypesForXHR2(data)) {
        if (options.headers['Content-type'].indexOf('json') >= 0) {
          options.body = 'json=' + JSON.stringify(data);
        } else {
          options.body = Object.keys(data).map(encodeUrlParams(data)).join('&');
        }
      }
      break;
    case 'put':
      options.headers['Content-type'] = 'application/json';
      options.credentials = 'include';
      if (!isEmpty(data) && !isNativeDataTypesForXHR2(data)) {
        options.body = JSON.stringify(data);
      }
      break;
    }

    if (isset(options.charset)) {
      options.headers['Accept-charset'] = options.charset;
    }

    return callback(url, options);
  };
}

function newfag(url, options) {
  return window$1.fetch(url, options).then(checkStatus);
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response.json();
  } else {
    return Promise.reject(new Error(response.statusText));
  }
}


function oldschool(url, options) {
  var xhr = new (window$1.XMLHttpRequest || window$1.ActiveXObject)('Microsoft.XMLHTTP');
  var abort, progress;
  /* report progress */
  if (xhr.upload) {
    progress = xhr.upload.onprogress;
  }
  if (xhr.abort) {
    abort = xhr.abort;
  }
  return Promise(function(resolve, reject) {
    xhr.onreadystatechange = function () {
      if (xhr.readyState === DONE) {
        var status = xhr.status;
        if (status) {
          if (isValidStatus(status)) {
            var response = xhr.response;
            if (options.headers.Accept === 'application/json') {
              try {
                response = JSON.parse(response);
              } catch (e) {
                reject(e, xhr);
              }
              resolve(response);
            } else {
              resolve(xhr.response);
            }
          } else {
            reject(xhr);
          }
        } else {
          reject(xhr);
        }
      }
    };

    /* response headers */
    var headers;

    Object.defineProperty(xhr, 'headers', {
      get: function () {
        if (!headers) {
          headers = parseHeaders(xhr.getAllResponseHeaders());
        }
        return headers;
      }
    });

    try {
      xhr.open(options.method, url, true);
    } catch (error) {
      reject(error);
    }

    /* set request headers */
    Object.keys(options.headers).forEach(function (header) {
      xhr.setRequestHeader(header, options.headers[header]);
    });

    /* request data */
    try {
      xhr.send(options.body);
    } catch (error) {
      reject(error, xhr);
    }

    /* response timeout */
    setTimeout(xhr.abort.bind(xhr), options.timeout);

  }, abort, progress);
}

function isValidStatus(status) {
  return status >= 200 && status < 300 || status === 304;
}

function parseHeaders(h) {
  var ret = {},
    key, val, i;

  h.split('\n').forEach(function (header) {
    if ((i = header.indexOf(':')) > 0) {
      key = header.slice(0, i).replace(/^[\s]+|[\s]+$/g, '').toLowerCase();
      val = header.slice(i + 1, header.length).replace(/^[\s]+|[\s]+$/g, '');
      if (key && key.length) {
        ret[key] = val;
      }
    }
  });

  return ret;
}

function isNativeDataTypesForXHR2(data) {
  return 'FormData' in window$1 && data instanceof FormData
    || 'ArrayBuffer' in window$1 && data instanceof ArrayBuffer
    || 'ArrayBufferView' in window$1 && data instanceof ArrayBufferView
    || 'Blob' in window$1 && data instanceof Blob;
}

function jsonp(url, data, options) {
  return Promise(function(resolve, reject){
    var script = document.createElement('script');
    var _rand = '_' + rand();
    var callbackName = options && options.callbackName || 'callback';
    if (isString(data)) {
      data += '&' + callbackName + '=' + _rand;
    } else if (isObject(data)) {
      data[callbackName] = _rand;
      data = Object.keys(data).map(encodeUrlParams(data)).join('&');
    } else {
      data = callbackName + '=' + _rand;
    }
    var src = url + (url.indexOf('?') === -1 ? '?' : '') + data;
    var jsonpTimer;
    window$1[_rand] = function (res) {
      clearTimeout(jsonpTimer);
      resolve(res);
      window$1[_rand] = null;
      body.removeChild(script);
    };
    body.appendChild(script);
    script.src = src;
    jsonpTimer = setTimeout(()=> {
      body.removeChild(script);
      window$1[_rand] = null;
      reject('timeout');
    }, DEFAULT_TIMEOUT);
  });
}

function encodeUrlParams(obj) {
  return function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]);
  };
}

module.exports = fetch$1;