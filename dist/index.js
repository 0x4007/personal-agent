import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  }
});

// node_modules/universal-user-agent/index.js
function getUserAgent() {
  if (typeof navigator === "object" && "userAgent" in navigator) {
    return navigator.userAgent;
  }
  if (typeof process === "object" && process.version !== void 0) {
    return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
  }
  return "<environment undetectable>";
}
var init_universal_user_agent = __esm({
  "node_modules/universal-user-agent/index.js"() {
    "use strict";
    init_esm_shims();
  }
});

// node_modules/before-after-hook/lib/register.js
function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }
  if (!options) {
    options = {};
  }
  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name2) => {
      return register.bind(null, state, name2, callback, options);
    }, method)();
  }
  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }
    return state.registry[name].reduce((method2, registered) => {
      return registered.hook.bind(null, method2, options);
    }, method)();
  });
}
var init_register = __esm({
  "node_modules/before-after-hook/lib/register.js"() {
    "use strict";
    init_esm_shims();
  }
});

// node_modules/before-after-hook/lib/add.js
function addHook(state, kind, name, hook2) {
  const orig = hook2;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }
  if (kind === "before") {
    hook2 = (method, options) => {
      return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
    };
  }
  if (kind === "after") {
    hook2 = (method, options) => {
      let result;
      return Promise.resolve().then(method.bind(null, options)).then((result_) => {
        result = result_;
        return orig(result, options);
      }).then(() => {
        return result;
      });
    };
  }
  if (kind === "error") {
    hook2 = (method, options) => {
      return Promise.resolve().then(method.bind(null, options)).catch((error) => {
        return orig(error, options);
      });
    };
  }
  state.registry[name].push({
    hook: hook2,
    orig
  });
}
var init_add = __esm({
  "node_modules/before-after-hook/lib/add.js"() {
    "use strict";
    init_esm_shims();
  }
});

// node_modules/before-after-hook/lib/remove.js
function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }
  const index = state.registry[name].map((registered) => {
    return registered.orig;
  }).indexOf(method);
  if (index === -1) {
    return;
  }
  state.registry[name].splice(index, 1);
}
var init_remove = __esm({
  "node_modules/before-after-hook/lib/remove.js"() {
    "use strict";
    init_esm_shims();
  }
});

// node_modules/before-after-hook/index.js
function bindApi(hook2, state, name) {
  const removeHookRef = bindable(removeHook, null).apply(
    null,
    name ? [state, name] : [state]
  );
  hook2.api = { remove: removeHookRef };
  hook2.remove = removeHookRef;
  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = name ? [state, kind, name] : [state, kind];
    hook2[kind] = hook2.api[kind] = bindable(addHook, null).apply(null, args);
  });
}
function Singular() {
  const singularHookName = Symbol("Singular");
  const singularHookState = {
    registry: {}
  };
  const singularHook = register.bind(null, singularHookState, singularHookName);
  bindApi(singularHook, singularHookState, singularHookName);
  return singularHook;
}
function Collection() {
  const state = {
    registry: {}
  };
  const hook2 = register.bind(null, state);
  bindApi(hook2, state);
  return hook2;
}
var bind, bindable, before_after_hook_default;
var init_before_after_hook = __esm({
  "node_modules/before-after-hook/index.js"() {
    "use strict";
    init_esm_shims();
    init_register();
    init_add();
    init_remove();
    bind = Function.bind;
    bindable = bind.bind(bind);
    before_after_hook_default = { Singular, Collection };
  }
});

// node_modules/@octokit/core/node_modules/@octokit/request/node_modules/@octokit/endpoint/dist-bundle/index.js
function lowercaseKeys(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}
function removeUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}
function merge(defaults, route, options) {
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys(options.headers);
  removeUndefinedProperties(options);
  removeUndefinedProperties(options.headers);
  const mergedOptions = mergeDeep(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && defaults.mediaType.previews?.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}
function addQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}
function removeNonChars(variableName) {
  return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
  const matches = url.match(urlVariableRegex);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}
function omit(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}
function encodeReserved(str) {
  return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
  if (key) {
    return encodeUnreserved(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue(operator, value, isKeyOperator(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            result.push(
              encodeValue(operator, value2, isKeyOperator(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              result.push(encodeValue(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            tmp.push(encodeValue(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              tmp.push(encodeUnreserved(k));
              tmp.push(encodeValue(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator(operator)) {
          result.push(encodeUnreserved(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined(value)) {
        result.push(encodeUnreserved(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl(template) {
  return {
    expand: expand.bind(null, template)
  };
}
function expand(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}
function parse(options) {
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames(url);
  url = parseUrl(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if (options.mediaType.previews?.length) {
        const previewsFromAcceptHeader = headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}
function endpointWithDefaults(defaults, route, options) {
  return parse(merge(defaults, route, options));
}
function withDefaults(oldDefaults, newDefaults) {
  const DEFAULTS22 = merge(oldDefaults, newDefaults);
  const endpoint22 = endpointWithDefaults.bind(null, DEFAULTS22);
  return Object.assign(endpoint22, {
    DEFAULTS: DEFAULTS22,
    defaults: withDefaults.bind(null, DEFAULTS22),
    merge: merge.bind(null, DEFAULTS22),
    parse
  });
}
var VERSION, userAgent, DEFAULTS, urlVariableRegex, endpoint;
var init_dist_bundle = __esm({
  "node_modules/@octokit/core/node_modules/@octokit/request/node_modules/@octokit/endpoint/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    init_universal_user_agent();
    VERSION = "0.0.0-development";
    userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`;
    DEFAULTS = {
      method: "GET",
      baseUrl: "https://api.github.com",
      headers: {
        accept: "application/vnd.github.v3+json",
        "user-agent": userAgent
      },
      mediaType: {
        format: ""
      }
    };
    urlVariableRegex = /\{[^{}}]+\}/g;
    endpoint = withDefaults(null, DEFAULTS);
  }
});

// node_modules/fast-content-type-parse/index.js
var require_fast_content_type_parse = __commonJS({
  "node_modules/fast-content-type-parse/index.js"(exports, module) {
    "use strict";
    init_esm_shims();
    var NullObject = function NullObject2() {
    };
    NullObject.prototype = /* @__PURE__ */ Object.create(null);
    var paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu;
    var quotedPairRE = /\\([\v\u0020-\u00ff])/gu;
    var mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u;
    var defaultContentType = { type: "", parameters: new NullObject() };
    Object.freeze(defaultContentType.parameters);
    Object.freeze(defaultContentType);
    function parse3(header) {
      if (typeof header !== "string") {
        throw new TypeError("argument header is required and must be a string");
      }
      let index = header.indexOf(";");
      const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type) === false) {
        throw new TypeError("invalid media type");
      }
      const result = {
        type: type.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          throw new TypeError("invalid parameter format");
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        throw new TypeError("invalid parameter format");
      }
      return result;
    }
    function safeParse3(header) {
      if (typeof header !== "string") {
        return defaultContentType;
      }
      let index = header.indexOf(";");
      const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type) === false) {
        return defaultContentType;
      }
      const result = {
        type: type.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          return defaultContentType;
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        return defaultContentType;
      }
      return result;
    }
    module.exports.default = { parse: parse3, safeParse: safeParse3 };
    module.exports.parse = parse3;
    module.exports.safeParse = safeParse3;
    module.exports.defaultContentType = defaultContentType;
  }
});

// node_modules/@octokit/core/node_modules/@octokit/request-error/dist-src/index.js
var RequestError;
var init_dist_src = __esm({
  "node_modules/@octokit/core/node_modules/@octokit/request-error/dist-src/index.js"() {
    "use strict";
    init_esm_shims();
    RequestError = class extends Error {
      name;
      /**
       * http status code
       */
      status;
      /**
       * Request options that lead to the error.
       */
      request;
      /**
       * Response object if a response was received
       */
      response;
      constructor(message, statusCode, options) {
        super(message, { cause: options.cause });
        this.name = "HttpError";
        this.status = Number.parseInt(statusCode);
        if (Number.isNaN(this.status)) {
          this.status = 0;
        }
        if ("response" in options) {
          this.response = options.response;
        }
        const requestCopy = Object.assign({}, options.request);
        if (options.request.headers.authorization) {
          requestCopy.headers = Object.assign({}, options.request.headers, {
            authorization: options.request.headers.authorization.replace(
              /(?<! ) .*$/,
              " [REDACTED]"
            )
          });
        }
        requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
        this.request = requestCopy;
      }
    };
  }
});

// node_modules/@octokit/core/node_modules/@octokit/request/dist-bundle/index.js
function isPlainObject2(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
async function fetchWrapper(requestOptions) {
  const fetch2 = requestOptions.request?.fetch || globalThis.fetch;
  if (!fetch2) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = requestOptions.request?.log || console;
  const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
  const body = isPlainObject2(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch2(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: requestOptions.request?.redirect,
      headers: requestHeaders,
      signal: requestOptions.request?.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError(toErrorMessage(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(noop);
  }
  const mimetype = (0, import_fast_content_type_parse.safeParse)(contentType);
  if (isJSONResponse(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") {
    return response.text().catch(noop);
  } else {
    return response.arrayBuffer().catch(
      /* v8 ignore next -- @preserve */
      () => new ArrayBuffer(0)
    );
  }
}
function isJSONResponse(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults2(oldEndpoint, newDefaults) {
  const endpoint22 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint22.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper(endpoint22.parse(endpointOptions));
    }
    const request22 = (route2, parameters2) => {
      return fetchWrapper(
        endpoint22.parse(endpoint22.merge(route2, parameters2))
      );
    };
    Object.assign(request22, {
      endpoint: endpoint22,
      defaults: withDefaults2.bind(null, endpoint22)
    });
    return endpointOptions.request.hook(request22, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint22,
    defaults: withDefaults2.bind(null, endpoint22)
  });
}
var import_fast_content_type_parse, VERSION2, defaults_default, noop, request;
var init_dist_bundle2 = __esm({
  "node_modules/@octokit/core/node_modules/@octokit/request/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    init_dist_bundle();
    init_universal_user_agent();
    import_fast_content_type_parse = __toESM(require_fast_content_type_parse(), 1);
    init_dist_src();
    VERSION2 = "10.0.7";
    defaults_default = {
      headers: {
        "user-agent": `octokit-request.js/${VERSION2} ${getUserAgent()}`
      }
    };
    noop = () => "";
    request = withDefaults2(endpoint, defaults_default);
  }
});

// node_modules/@octokit/graphql/node_modules/@octokit/request/node_modules/@octokit/endpoint/dist-bundle/index.js
function lowercaseKeys2(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}
function isPlainObject3(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep2(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject3(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep2(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}
function removeUndefinedProperties2(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}
function merge2(defaults, route, options) {
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys2(options.headers);
  removeUndefinedProperties2(options);
  removeUndefinedProperties2(options.headers);
  const mergedOptions = mergeDeep2(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && defaults.mediaType.previews?.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}
function addQueryParameters2(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}
function removeNonChars2(variableName) {
  return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames2(url) {
  const matches = url.match(urlVariableRegex2);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars2).reduce((a, b) => a.concat(b), []);
}
function omit2(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}
function encodeReserved2(str) {
  return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved2(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue2(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved2(value) : encodeUnreserved2(value);
  if (key) {
    return encodeUnreserved2(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined2(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator2(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues2(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined2(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue2(operator, value, isKeyOperator2(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined2).forEach(function(value2) {
            result.push(
              encodeValue2(operator, value2, isKeyOperator2(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined2(value[k])) {
              result.push(encodeValue2(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined2).forEach(function(value2) {
            tmp.push(encodeValue2(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined2(value[k])) {
              tmp.push(encodeUnreserved2(k));
              tmp.push(encodeValue2(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator2(operator)) {
          result.push(encodeUnreserved2(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined2(value)) {
        result.push(encodeUnreserved2(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved2(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl2(template) {
  return {
    expand: expand2.bind(null, template)
  };
}
function expand2(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues2(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved2(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}
function parse2(options) {
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit2(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames2(url);
  url = parseUrl2(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit2(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if (options.mediaType.previews?.length) {
        const previewsFromAcceptHeader = headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters2(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}
function endpointWithDefaults2(defaults, route, options) {
  return parse2(merge2(defaults, route, options));
}
function withDefaults3(oldDefaults, newDefaults) {
  const DEFAULTS22 = merge2(oldDefaults, newDefaults);
  const endpoint22 = endpointWithDefaults2.bind(null, DEFAULTS22);
  return Object.assign(endpoint22, {
    DEFAULTS: DEFAULTS22,
    defaults: withDefaults3.bind(null, DEFAULTS22),
    merge: merge2.bind(null, DEFAULTS22),
    parse: parse2
  });
}
var VERSION3, userAgent2, DEFAULTS2, urlVariableRegex2, endpoint2;
var init_dist_bundle3 = __esm({
  "node_modules/@octokit/graphql/node_modules/@octokit/request/node_modules/@octokit/endpoint/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    init_universal_user_agent();
    VERSION3 = "0.0.0-development";
    userAgent2 = `octokit-endpoint.js/${VERSION3} ${getUserAgent()}`;
    DEFAULTS2 = {
      method: "GET",
      baseUrl: "https://api.github.com",
      headers: {
        accept: "application/vnd.github.v3+json",
        "user-agent": userAgent2
      },
      mediaType: {
        format: ""
      }
    };
    urlVariableRegex2 = /\{[^{}}]+\}/g;
    endpoint2 = withDefaults3(null, DEFAULTS2);
  }
});

// node_modules/@octokit/graphql/node_modules/@octokit/request/node_modules/@octokit/request-error/dist-src/index.js
var RequestError2;
var init_dist_src2 = __esm({
  "node_modules/@octokit/graphql/node_modules/@octokit/request/node_modules/@octokit/request-error/dist-src/index.js"() {
    "use strict";
    init_esm_shims();
    RequestError2 = class extends Error {
      name;
      /**
       * http status code
       */
      status;
      /**
       * Request options that lead to the error.
       */
      request;
      /**
       * Response object if a response was received
       */
      response;
      constructor(message, statusCode, options) {
        super(message, { cause: options.cause });
        this.name = "HttpError";
        this.status = Number.parseInt(statusCode);
        if (Number.isNaN(this.status)) {
          this.status = 0;
        }
        if ("response" in options) {
          this.response = options.response;
        }
        const requestCopy = Object.assign({}, options.request);
        if (options.request.headers.authorization) {
          requestCopy.headers = Object.assign({}, options.request.headers, {
            authorization: options.request.headers.authorization.replace(
              /(?<! ) .*$/,
              " [REDACTED]"
            )
          });
        }
        requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
        this.request = requestCopy;
      }
    };
  }
});

// node_modules/@octokit/graphql/node_modules/@octokit/request/dist-bundle/index.js
function isPlainObject4(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
async function fetchWrapper2(requestOptions) {
  const fetch2 = requestOptions.request?.fetch || globalThis.fetch;
  if (!fetch2) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = requestOptions.request?.log || console;
  const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
  const body = isPlainObject4(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch2(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: requestOptions.request?.redirect,
      headers: requestHeaders,
      signal: requestOptions.request?.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError2(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError2(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData2(fetchResponse);
    throw new RequestError2("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData2(fetchResponse);
    throw new RequestError2(toErrorMessage2(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData2(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData2(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(noop2);
  }
  const mimetype = (0, import_fast_content_type_parse2.safeParse)(contentType);
  if (isJSONResponse2(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") {
    return response.text().catch(noop2);
  } else {
    return response.arrayBuffer().catch(
      /* v8 ignore next -- @preserve */
      () => new ArrayBuffer(0)
    );
  }
}
function isJSONResponse2(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage2(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults4(oldEndpoint, newDefaults) {
  const endpoint22 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint22.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper2(endpoint22.parse(endpointOptions));
    }
    const request22 = (route2, parameters2) => {
      return fetchWrapper2(
        endpoint22.parse(endpoint22.merge(route2, parameters2))
      );
    };
    Object.assign(request22, {
      endpoint: endpoint22,
      defaults: withDefaults4.bind(null, endpoint22)
    });
    return endpointOptions.request.hook(request22, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint22,
    defaults: withDefaults4.bind(null, endpoint22)
  });
}
var import_fast_content_type_parse2, VERSION4, defaults_default2, noop2, request2;
var init_dist_bundle4 = __esm({
  "node_modules/@octokit/graphql/node_modules/@octokit/request/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    init_dist_bundle3();
    init_universal_user_agent();
    import_fast_content_type_parse2 = __toESM(require_fast_content_type_parse(), 1);
    init_dist_src2();
    VERSION4 = "10.0.7";
    defaults_default2 = {
      headers: {
        "user-agent": `octokit-request.js/${VERSION4} ${getUserAgent()}`
      }
    };
    noop2 = () => "";
    request2 = withDefaults4(endpoint2, defaults_default2);
  }
});

// node_modules/@octokit/graphql/dist-bundle/index.js
function _buildMessageForResponseErrors(data) {
  return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
function graphql(request22, query, options) {
  if (options) {
    if (typeof query === "string" && "query" in options) {
      return Promise.reject(
        new Error(`[@octokit/graphql] "query" cannot be used as variable name`)
      );
    }
    for (const key in options) {
      if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
      return Promise.reject(
        new Error(
          `[@octokit/graphql] "${key}" cannot be used as variable name`
        )
      );
    }
  }
  const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
  const requestOptions = Object.keys(
    parsedOptions
  ).reduce((result, key) => {
    if (NON_VARIABLE_OPTIONS.includes(key)) {
      result[key] = parsedOptions[key];
      return result;
    }
    if (!result.variables) {
      result.variables = {};
    }
    result.variables[key] = parsedOptions[key];
    return result;
  }, {});
  const baseUrl = parsedOptions.baseUrl || request22.endpoint.DEFAULTS.baseUrl;
  if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
    requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
  }
  return request22(requestOptions).then((response) => {
    if (response.data.errors) {
      const headers = {};
      for (const key of Object.keys(response.headers)) {
        headers[key] = response.headers[key];
      }
      throw new GraphqlResponseError(
        requestOptions,
        headers,
        response.data
      );
    }
    return response.data.data;
  });
}
function withDefaults5(request22, newDefaults) {
  const newRequest = request22.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: withDefaults5.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}
function withCustomRequest(customRequest) {
  return withDefaults5(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}
var VERSION5, GraphqlResponseError, NON_VARIABLE_OPTIONS, FORBIDDEN_VARIABLE_OPTIONS, GHES_V3_SUFFIX_REGEX, graphql2;
var init_dist_bundle5 = __esm({
  "node_modules/@octokit/graphql/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    init_dist_bundle4();
    init_universal_user_agent();
    VERSION5 = "0.0.0-development";
    GraphqlResponseError = class extends Error {
      constructor(request22, headers, response) {
        super(_buildMessageForResponseErrors(response));
        this.request = request22;
        this.headers = headers;
        this.response = response;
        this.errors = response.errors;
        this.data = response.data;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }
      }
      name = "GraphqlResponseError";
      errors;
      data;
    };
    NON_VARIABLE_OPTIONS = [
      "method",
      "baseUrl",
      "url",
      "headers",
      "request",
      "query",
      "mediaType",
      "operationName"
    ];
    FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
    GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
    graphql2 = withDefaults5(request2, {
      headers: {
        "user-agent": `octokit-graphql.js/${VERSION5} ${getUserAgent()}`
      },
      method: "POST",
      url: "/graphql"
    });
  }
});

// node_modules/@octokit/auth-token/dist-bundle/index.js
async function auth(token) {
  const isApp = isJWT(token);
  const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
  const isUserToServer = token.startsWith("ghu_");
  const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
  return {
    type: "token",
    token,
    tokenType
  };
}
function withAuthorizationPrefix(token) {
  if (token.split(/\./).length === 3) {
    return `bearer ${token}`;
  }
  return `token ${token}`;
}
async function hook(token, request3, route, parameters) {
  const endpoint3 = request3.endpoint.merge(
    route,
    parameters
  );
  endpoint3.headers.authorization = withAuthorizationPrefix(token);
  return request3(endpoint3);
}
var b64url, sep, jwtRE, isJWT, createTokenAuth;
var init_dist_bundle6 = __esm({
  "node_modules/@octokit/auth-token/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    b64url = "(?:[a-zA-Z0-9_-]+)";
    sep = "\\.";
    jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
    isJWT = jwtRE.test.bind(jwtRE);
    createTokenAuth = function createTokenAuth2(token) {
      if (!token) {
        throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
      }
      if (typeof token !== "string") {
        throw new Error(
          "[@octokit/auth-token] Token passed to createTokenAuth is not a string"
        );
      }
      token = token.replace(/^(token|bearer) +/i, "");
      return Object.assign(auth.bind(null, token), {
        hook: hook.bind(null, token)
      });
    };
  }
});

// node_modules/@octokit/core/dist-src/version.js
var VERSION6;
var init_version = __esm({
  "node_modules/@octokit/core/dist-src/version.js"() {
    "use strict";
    init_esm_shims();
    VERSION6 = "7.0.6";
  }
});

// node_modules/@octokit/core/dist-src/index.js
function createLogger(logger = {}) {
  if (typeof logger.debug !== "function") {
    logger.debug = noop3;
  }
  if (typeof logger.info !== "function") {
    logger.info = noop3;
  }
  if (typeof logger.warn !== "function") {
    logger.warn = consoleWarn;
  }
  if (typeof logger.error !== "function") {
    logger.error = consoleError;
  }
  return logger;
}
var noop3, consoleWarn, consoleError, userAgentTrail, Octokit;
var init_dist_src3 = __esm({
  "node_modules/@octokit/core/dist-src/index.js"() {
    "use strict";
    init_esm_shims();
    init_universal_user_agent();
    init_before_after_hook();
    init_dist_bundle2();
    init_dist_bundle5();
    init_dist_bundle6();
    init_version();
    noop3 = () => {
    };
    consoleWarn = console.warn.bind(console);
    consoleError = console.error.bind(console);
    userAgentTrail = `octokit-core.js/${VERSION6} ${getUserAgent()}`;
    Octokit = class {
      static VERSION = VERSION6;
      static defaults(defaults) {
        const OctokitWithDefaults = class extends this {
          constructor(...args) {
            const options = args[0] || {};
            if (typeof defaults === "function") {
              super(defaults(options));
              return;
            }
            super(
              Object.assign(
                {},
                defaults,
                options,
                options.userAgent && defaults.userAgent ? {
                  userAgent: `${options.userAgent} ${defaults.userAgent}`
                } : null
              )
            );
          }
        };
        return OctokitWithDefaults;
      }
      static plugins = [];
      /**
       * Attach a plugin (or many) to your Octokit instance.
       *
       * @example
       * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
       */
      static plugin(...newPlugins) {
        const currentPlugins = this.plugins;
        const NewOctokit = class extends this {
          static plugins = currentPlugins.concat(
            newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
          );
        };
        return NewOctokit;
      }
      constructor(options = {}) {
        const hook2 = new before_after_hook_default.Collection();
        const requestDefaults = {
          baseUrl: request.endpoint.DEFAULTS.baseUrl,
          headers: {},
          request: Object.assign({}, options.request, {
            // @ts-ignore internal usage only, no need to type
            hook: hook2.bind(null, "request")
          }),
          mediaType: {
            previews: [],
            format: ""
          }
        };
        requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
        if (options.baseUrl) {
          requestDefaults.baseUrl = options.baseUrl;
        }
        if (options.previews) {
          requestDefaults.mediaType.previews = options.previews;
        }
        if (options.timeZone) {
          requestDefaults.headers["time-zone"] = options.timeZone;
        }
        this.request = request.defaults(requestDefaults);
        this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
        this.log = createLogger(options.log);
        this.hook = hook2;
        if (!options.authStrategy) {
          if (!options.auth) {
            this.auth = async () => ({
              type: "unauthenticated"
            });
          } else {
            const auth2 = createTokenAuth(options.auth);
            hook2.wrap("request", auth2.hook);
            this.auth = auth2;
          }
        } else {
          const { authStrategy, ...otherOptions } = options;
          const auth2 = authStrategy(
            Object.assign(
              {
                request: this.request,
                log: this.log,
                // we pass the current octokit instance as well as its constructor options
                // to allow for authentication strategies that return a new octokit instance
                // that shares the same internal state as the current one. The original
                // requirement for this was the "event-octokit" authentication strategy
                // of https://github.com/probot/octokit-auth-probot.
                octokit: this,
                octokitOptions: otherOptions
              },
              options.auth
            )
          );
          hook2.wrap("request", auth2.hook);
          this.auth = auth2;
        }
        const classConstructor = this.constructor;
        for (let i = 0; i < classConstructor.plugins.length; ++i) {
          Object.assign(this, classConstructor.plugins[i](this, options));
        }
      }
      // assigned during constructor
      request;
      graphql;
      log;
      hook;
      // TODO: type `octokit.auth` based on passed options.authStrategy
      auth;
    };
  }
});

// node_modules/@octokit/plugin-paginate-graphql/dist-bundle/index.js
function findPaginatedResourcePath(responseData) {
  const paginatedResourcePath = deepFindPathToProperty(
    responseData,
    "pageInfo"
  );
  if (paginatedResourcePath.length === 0) {
    throw new MissingPageInfo(responseData);
  }
  return paginatedResourcePath;
}
function paginateGraphQL(octokit) {
  return {
    graphql: Object.assign(octokit.graphql, {
      paginate: Object.assign(createPaginate(octokit), {
        iterator: createIterator(octokit)
      })
    })
  };
}
var generateMessage, MissingCursorChange, MissingPageInfo, isObject, deepFindPathToProperty, get, set, extractPageInfos, isForwardSearch, getCursorFrom, hasAnotherPage, createIterator, mergeResponses, createPaginate;
var init_dist_bundle7 = __esm({
  "node_modules/@octokit/plugin-paginate-graphql/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    generateMessage = (path3, cursorValue) => `The cursor at "${path3.join(
      ","
    )}" did not change its value "${cursorValue}" after a page transition. Please make sure your that your query is set up correctly.`;
    MissingCursorChange = class extends Error {
      constructor(pageInfo, cursorValue) {
        super(generateMessage(pageInfo.pathInQuery, cursorValue));
        this.pageInfo = pageInfo;
        this.cursorValue = cursorValue;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }
      }
      name = "MissingCursorChangeError";
    };
    MissingPageInfo = class extends Error {
      constructor(response) {
        super(
          `No pageInfo property found in response. Please make sure to specify the pageInfo in your query. Response-Data: ${JSON.stringify(
            response,
            null,
            2
          )}`
        );
        this.response = response;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }
      }
      name = "MissingPageInfo";
    };
    isObject = (value) => Object.prototype.toString.call(value) === "[object Object]";
    deepFindPathToProperty = (object, searchProp, path3 = []) => {
      for (const key of Object.keys(object)) {
        const currentPath = [...path3, key];
        const currentValue = object[key];
        if (isObject(currentValue)) {
          if (currentValue.hasOwnProperty(searchProp)) {
            return currentPath;
          }
          const result = deepFindPathToProperty(
            currentValue,
            searchProp,
            currentPath
          );
          if (result.length > 0) {
            return result;
          }
        }
      }
      return [];
    };
    get = (object, path3) => {
      return path3.reduce((current, nextProperty) => current[nextProperty], object);
    };
    set = (object, path3, mutator) => {
      const lastProperty = path3[path3.length - 1];
      const parentPath = [...path3].slice(0, -1);
      const parent = get(object, parentPath);
      if (typeof mutator === "function") {
        parent[lastProperty] = mutator(parent[lastProperty]);
      } else {
        parent[lastProperty] = mutator;
      }
    };
    extractPageInfos = (responseData) => {
      const pageInfoPath = findPaginatedResourcePath(responseData);
      return {
        pathInQuery: pageInfoPath,
        pageInfo: get(responseData, [...pageInfoPath, "pageInfo"])
      };
    };
    isForwardSearch = (givenPageInfo) => {
      return givenPageInfo.hasOwnProperty("hasNextPage");
    };
    getCursorFrom = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.endCursor : pageInfo.startCursor;
    hasAnotherPage = (pageInfo) => isForwardSearch(pageInfo) ? pageInfo.hasNextPage : pageInfo.hasPreviousPage;
    createIterator = (octokit) => {
      return (query, initialParameters = {}) => {
        let nextPageExists = true;
        let parameters = { ...initialParameters };
        return {
          [Symbol.asyncIterator]: () => ({
            async next() {
              if (!nextPageExists) return { done: true, value: {} };
              const response = await octokit.graphql(
                query,
                parameters
              );
              const pageInfoContext = extractPageInfos(response);
              const nextCursorValue = getCursorFrom(pageInfoContext.pageInfo);
              nextPageExists = hasAnotherPage(pageInfoContext.pageInfo);
              if (nextPageExists && nextCursorValue === parameters.cursor) {
                throw new MissingCursorChange(pageInfoContext, nextCursorValue);
              }
              parameters = {
                ...parameters,
                cursor: nextCursorValue
              };
              return { done: false, value: response };
            }
          })
        };
      };
    };
    mergeResponses = (response1, response2) => {
      if (Object.keys(response1).length === 0) {
        return Object.assign(response1, response2);
      }
      const path3 = findPaginatedResourcePath(response1);
      const nodesPath = [...path3, "nodes"];
      const newNodes = get(response2, nodesPath);
      if (newNodes) {
        set(response1, nodesPath, (values) => {
          return [...values, ...newNodes];
        });
      }
      const edgesPath = [...path3, "edges"];
      const newEdges = get(response2, edgesPath);
      if (newEdges) {
        set(response1, edgesPath, (values) => {
          return [...values, ...newEdges];
        });
      }
      const pageInfoPath = [...path3, "pageInfo"];
      set(response1, pageInfoPath, get(response2, pageInfoPath));
      return response1;
    };
    createPaginate = (octokit) => {
      const iterator2 = createIterator(octokit);
      return async (query, initialParameters = {}) => {
        let mergedResponse = {};
        for await (const response of iterator2(
          query,
          initialParameters
        )) {
          mergedResponse = mergeResponses(mergedResponse, response);
        }
        return mergedResponse;
      };
    };
  }
});

// node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js
function normalizePaginatedListResponse(response) {
  if (!response.data) {
    return {
      ...response,
      data: []
    };
  }
  const responseNeedsNormalization = ("total_count" in response.data || "total_commits" in response.data) && !("url" in response.data);
  if (!responseNeedsNormalization) return response;
  const incompleteResults = response.data.incomplete_results;
  const repositorySelection = response.data.repository_selection;
  const totalCount = response.data.total_count;
  const totalCommits = response.data.total_commits;
  delete response.data.incomplete_results;
  delete response.data.repository_selection;
  delete response.data.total_count;
  delete response.data.total_commits;
  const namespaceKey = Object.keys(response.data)[0];
  const data = response.data[namespaceKey];
  response.data = data;
  if (typeof incompleteResults !== "undefined") {
    response.data.incomplete_results = incompleteResults;
  }
  if (typeof repositorySelection !== "undefined") {
    response.data.repository_selection = repositorySelection;
  }
  response.data.total_count = totalCount;
  response.data.total_commits = totalCommits;
  return response;
}
function iterator(octokit, route, parameters) {
  const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
  const requestMethod = typeof route === "function" ? route : octokit.request;
  const method = options.method;
  const headers = options.headers;
  let url = options.url;
  return {
    [Symbol.asyncIterator]: () => ({
      async next() {
        if (!url) return { done: true };
        try {
          const response = await requestMethod({ method, url, headers });
          const normalizedResponse = normalizePaginatedListResponse(response);
          url = ((normalizedResponse.headers.link || "").match(
            /<([^<>]+)>;\s*rel="next"/
          ) || [])[1];
          if (!url && "total_commits" in normalizedResponse.data) {
            const parsedUrl = new URL(normalizedResponse.url);
            const params = parsedUrl.searchParams;
            const page = parseInt(params.get("page") || "1", 10);
            const per_page = parseInt(params.get("per_page") || "250", 10);
            if (page * per_page < normalizedResponse.data.total_commits) {
              params.set("page", String(page + 1));
              url = parsedUrl.toString();
            }
          }
          return { value: normalizedResponse };
        } catch (error) {
          if (error.status !== 409) throw error;
          url = "";
          return {
            value: {
              status: 200,
              headers: {},
              data: []
            }
          };
        }
      }
    })
  };
}
function paginate(octokit, route, parameters, mapFn) {
  if (typeof parameters === "function") {
    mapFn = parameters;
    parameters = void 0;
  }
  return gather(
    octokit,
    [],
    iterator(octokit, route, parameters)[Symbol.asyncIterator](),
    mapFn
  );
}
function gather(octokit, results, iterator2, mapFn) {
  return iterator2.next().then((result) => {
    if (result.done) {
      return results;
    }
    let earlyExit = false;
    function done() {
      earlyExit = true;
    }
    results = results.concat(
      mapFn ? mapFn(result.value, done) : result.value.data
    );
    if (earlyExit) {
      return results;
    }
    return gather(octokit, results, iterator2, mapFn);
  });
}
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
var VERSION7, composePaginateRest;
var init_dist_bundle8 = __esm({
  "node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    VERSION7 = "0.0.0-development";
    composePaginateRest = Object.assign(paginate, {
      iterator
    });
    paginateRest.VERSION = VERSION7;
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js
var VERSION8;
var init_version2 = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/version.js"() {
    "use strict";
    init_esm_shims();
    VERSION8 = "17.0.0";
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js
var Endpoints, endpoints_default;
var init_endpoints = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/generated/endpoints.js"() {
    "use strict";
    init_esm_shims();
    Endpoints = {
      actions: {
        addCustomLabelsToSelfHostedRunnerForOrg: [
          "POST /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        addCustomLabelsToSelfHostedRunnerForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        addRepoAccessToSelfHostedRunnerGroupInOrg: [
          "PUT /orgs/{org}/actions/runner-groups/{runner_group_id}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgVariable: [
          "PUT /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
        ],
        approveWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve"
        ],
        cancelWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel"
        ],
        createEnvironmentVariable: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/variables"
        ],
        createHostedRunnerForOrg: ["POST /orgs/{org}/actions/hosted-runners"],
        createOrUpdateEnvironmentSecret: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}"
        ],
        createOrgVariable: ["POST /orgs/{org}/actions/variables"],
        createRegistrationTokenForOrg: [
          "POST /orgs/{org}/actions/runners/registration-token"
        ],
        createRegistrationTokenForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/registration-token"
        ],
        createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
        createRemoveTokenForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/remove-token"
        ],
        createRepoVariable: ["POST /repos/{owner}/{repo}/actions/variables"],
        createWorkflowDispatch: [
          "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches"
        ],
        deleteActionsCacheById: [
          "DELETE /repos/{owner}/{repo}/actions/caches/{cache_id}"
        ],
        deleteActionsCacheByKey: [
          "DELETE /repos/{owner}/{repo}/actions/caches{?key,ref}"
        ],
        deleteArtifact: [
          "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"
        ],
        deleteCustomImageFromOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
        ],
        deleteCustomImageVersionFromOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
        ],
        deleteEnvironmentSecret: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        deleteEnvironmentVariable: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        deleteHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
        deleteOrgVariable: ["DELETE /orgs/{org}/actions/variables/{name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}"
        ],
        deleteRepoVariable: [
          "DELETE /repos/{owner}/{repo}/actions/variables/{name}"
        ],
        deleteSelfHostedRunnerFromOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}"
        ],
        deleteSelfHostedRunnerFromRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}"
        ],
        deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
        deleteWorkflowRunLogs: [
          "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
        ],
        disableSelectedRepositoryGithubActionsOrganization: [
          "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}"
        ],
        disableWorkflow: [
          "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable"
        ],
        downloadArtifact: [
          "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}"
        ],
        downloadJobLogsForWorkflowRun: [
          "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
        ],
        downloadWorkflowRunAttemptLogs: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/logs"
        ],
        downloadWorkflowRunLogs: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs"
        ],
        enableSelectedRepositoryGithubActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}"
        ],
        enableWorkflow: [
          "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable"
        ],
        forceCancelWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/force-cancel"
        ],
        generateRunnerJitconfigForOrg: [
          "POST /orgs/{org}/actions/runners/generate-jitconfig"
        ],
        generateRunnerJitconfigForRepo: [
          "POST /repos/{owner}/{repo}/actions/runners/generate-jitconfig"
        ],
        getActionsCacheList: ["GET /repos/{owner}/{repo}/actions/caches"],
        getActionsCacheUsage: ["GET /repos/{owner}/{repo}/actions/cache/usage"],
        getActionsCacheUsageByRepoForOrg: [
          "GET /orgs/{org}/actions/cache/usage-by-repository"
        ],
        getActionsCacheUsageForOrg: ["GET /orgs/{org}/actions/cache/usage"],
        getAllowedActionsOrganization: [
          "GET /orgs/{org}/actions/permissions/selected-actions"
        ],
        getAllowedActionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/selected-actions"
        ],
        getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
        getCustomImageForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}"
        ],
        getCustomImageVersionForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions/{version}"
        ],
        getCustomOidcSubClaimForRepo: [
          "GET /repos/{owner}/{repo}/actions/oidc/customization/sub"
        ],
        getEnvironmentPublicKey: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key"
        ],
        getEnvironmentSecret: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}"
        ],
        getEnvironmentVariable: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        getGithubActionsDefaultWorkflowPermissionsOrganization: [
          "GET /orgs/{org}/actions/permissions/workflow"
        ],
        getGithubActionsDefaultWorkflowPermissionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/workflow"
        ],
        getGithubActionsPermissionsOrganization: [
          "GET /orgs/{org}/actions/permissions"
        ],
        getGithubActionsPermissionsRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions"
        ],
        getHostedRunnerForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        getHostedRunnersGithubOwnedImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/github-owned"
        ],
        getHostedRunnersLimitsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/limits"
        ],
        getHostedRunnersMachineSpecsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/machine-sizes"
        ],
        getHostedRunnersPartnerImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/partner"
        ],
        getHostedRunnersPlatformsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/platforms"
        ],
        getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
        getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
        getOrgVariable: ["GET /orgs/{org}/actions/variables/{name}"],
        getPendingDeploymentsForRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
        ],
        getRepoPermissions: [
          "GET /repos/{owner}/{repo}/actions/permissions",
          {},
          { renamed: ["actions", "getGithubActionsPermissionsRepository"] }
        ],
        getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
        getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
        getRepoVariable: ["GET /repos/{owner}/{repo}/actions/variables/{name}"],
        getReviewsForRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals"
        ],
        getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
        getSelfHostedRunnerForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/{runner_id}"
        ],
        getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
        getWorkflowAccessToRepository: [
          "GET /repos/{owner}/{repo}/actions/permissions/access"
        ],
        getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
        getWorkflowRunAttempt: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}"
        ],
        getWorkflowRunUsage: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing"
        ],
        getWorkflowUsage: [
          "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing"
        ],
        listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
        listCustomImageVersionsForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom/{image_definition_id}/versions"
        ],
        listCustomImagesForOrg: [
          "GET /orgs/{org}/actions/hosted-runners/images/custom"
        ],
        listEnvironmentSecrets: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/secrets"
        ],
        listEnvironmentVariables: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/variables"
        ],
        listGithubHostedRunnersInGroupForOrg: [
          "GET /orgs/{org}/actions/runner-groups/{runner_group_id}/hosted-runners"
        ],
        listHostedRunnersForOrg: ["GET /orgs/{org}/actions/hosted-runners"],
        listJobsForWorkflowRun: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
        ],
        listJobsForWorkflowRunAttempt: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/attempts/{attempt_number}/jobs"
        ],
        listLabelsForSelfHostedRunnerForOrg: [
          "GET /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        listLabelsForSelfHostedRunnerForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
        listOrgVariables: ["GET /orgs/{org}/actions/variables"],
        listRepoOrganizationSecrets: [
          "GET /repos/{owner}/{repo}/actions/organization-secrets"
        ],
        listRepoOrganizationVariables: [
          "GET /repos/{owner}/{repo}/actions/organization-variables"
        ],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
        listRepoVariables: ["GET /repos/{owner}/{repo}/actions/variables"],
        listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
        listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
        listRunnerApplicationsForRepo: [
          "GET /repos/{owner}/{repo}/actions/runners/downloads"
        ],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/actions/secrets/{secret_name}/repositories"
        ],
        listSelectedReposForOrgVariable: [
          "GET /orgs/{org}/actions/variables/{name}/repositories"
        ],
        listSelectedRepositoriesEnabledGithubActionsOrganization: [
          "GET /orgs/{org}/actions/permissions/repositories"
        ],
        listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
        listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
        listWorkflowRunArtifacts: [
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"
        ],
        listWorkflowRuns: [
          "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
        ],
        listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
        reRunJobForWorkflowRun: [
          "POST /repos/{owner}/{repo}/actions/jobs/{job_id}/rerun"
        ],
        reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
        reRunWorkflowFailedJobs: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun-failed-jobs"
        ],
        removeAllCustomLabelsFromSelfHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        removeAllCustomLabelsFromSelfHostedRunnerForRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        removeCustomLabelFromSelfHostedRunnerForOrg: [
          "DELETE /orgs/{org}/actions/runners/{runner_id}/labels/{name}"
        ],
        removeCustomLabelFromSelfHostedRunnerForRepo: [
          "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}/labels/{name}"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}"
        ],
        removeSelectedRepoFromOrgVariable: [
          "DELETE /orgs/{org}/actions/variables/{name}/repositories/{repository_id}"
        ],
        reviewCustomGatesForRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/deployment_protection_rule"
        ],
        reviewPendingDeploymentsForRun: [
          "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments"
        ],
        setAllowedActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/selected-actions"
        ],
        setAllowedActionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions"
        ],
        setCustomLabelsForSelfHostedRunnerForOrg: [
          "PUT /orgs/{org}/actions/runners/{runner_id}/labels"
        ],
        setCustomLabelsForSelfHostedRunnerForRepo: [
          "PUT /repos/{owner}/{repo}/actions/runners/{runner_id}/labels"
        ],
        setCustomOidcSubClaimForRepo: [
          "PUT /repos/{owner}/{repo}/actions/oidc/customization/sub"
        ],
        setGithubActionsDefaultWorkflowPermissionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/workflow"
        ],
        setGithubActionsDefaultWorkflowPermissionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/workflow"
        ],
        setGithubActionsPermissionsOrganization: [
          "PUT /orgs/{org}/actions/permissions"
        ],
        setGithubActionsPermissionsRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories"
        ],
        setSelectedReposForOrgVariable: [
          "PUT /orgs/{org}/actions/variables/{name}/repositories"
        ],
        setSelectedRepositoriesEnabledGithubActionsOrganization: [
          "PUT /orgs/{org}/actions/permissions/repositories"
        ],
        setWorkflowAccessToRepository: [
          "PUT /repos/{owner}/{repo}/actions/permissions/access"
        ],
        updateEnvironmentVariable: [
          "PATCH /repos/{owner}/{repo}/environments/{environment_name}/variables/{name}"
        ],
        updateHostedRunnerForOrg: [
          "PATCH /orgs/{org}/actions/hosted-runners/{hosted_runner_id}"
        ],
        updateOrgVariable: ["PATCH /orgs/{org}/actions/variables/{name}"],
        updateRepoVariable: [
          "PATCH /repos/{owner}/{repo}/actions/variables/{name}"
        ]
      },
      activity: {
        checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
        deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
        deleteThreadSubscription: [
          "DELETE /notifications/threads/{thread_id}/subscription"
        ],
        getFeeds: ["GET /feeds"],
        getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
        getThread: ["GET /notifications/threads/{thread_id}"],
        getThreadSubscriptionForAuthenticatedUser: [
          "GET /notifications/threads/{thread_id}/subscription"
        ],
        listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
        listNotificationsForAuthenticatedUser: ["GET /notifications"],
        listOrgEventsForAuthenticatedUser: [
          "GET /users/{username}/events/orgs/{org}"
        ],
        listPublicEvents: ["GET /events"],
        listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
        listPublicEventsForUser: ["GET /users/{username}/events/public"],
        listPublicOrgEvents: ["GET /orgs/{org}/events"],
        listReceivedEventsForUser: ["GET /users/{username}/received_events"],
        listReceivedPublicEventsForUser: [
          "GET /users/{username}/received_events/public"
        ],
        listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
        listRepoNotificationsForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/notifications"
        ],
        listReposStarredByAuthenticatedUser: ["GET /user/starred"],
        listReposStarredByUser: ["GET /users/{username}/starred"],
        listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
        listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
        listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
        listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
        markNotificationsAsRead: ["PUT /notifications"],
        markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
        markThreadAsDone: ["DELETE /notifications/threads/{thread_id}"],
        markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
        setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
        setThreadSubscription: [
          "PUT /notifications/threads/{thread_id}/subscription"
        ],
        starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
        unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"]
      },
      apps: {
        addRepoToInstallation: [
          "PUT /user/installations/{installation_id}/repositories/{repository_id}",
          {},
          { renamed: ["apps", "addRepoToInstallationForAuthenticatedUser"] }
        ],
        addRepoToInstallationForAuthenticatedUser: [
          "PUT /user/installations/{installation_id}/repositories/{repository_id}"
        ],
        checkToken: ["POST /applications/{client_id}/token"],
        createFromManifest: ["POST /app-manifests/{code}/conversions"],
        createInstallationAccessToken: [
          "POST /app/installations/{installation_id}/access_tokens"
        ],
        deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
        deleteInstallation: ["DELETE /app/installations/{installation_id}"],
        deleteToken: ["DELETE /applications/{client_id}/token"],
        getAuthenticated: ["GET /app"],
        getBySlug: ["GET /apps/{app_slug}"],
        getInstallation: ["GET /app/installations/{installation_id}"],
        getOrgInstallation: ["GET /orgs/{org}/installation"],
        getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
        getSubscriptionPlanForAccount: [
          "GET /marketplace_listing/accounts/{account_id}"
        ],
        getSubscriptionPlanForAccountStubbed: [
          "GET /marketplace_listing/stubbed/accounts/{account_id}"
        ],
        getUserInstallation: ["GET /users/{username}/installation"],
        getWebhookConfigForApp: ["GET /app/hook/config"],
        getWebhookDelivery: ["GET /app/hook/deliveries/{delivery_id}"],
        listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
        listAccountsForPlanStubbed: [
          "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts"
        ],
        listInstallationReposForAuthenticatedUser: [
          "GET /user/installations/{installation_id}/repositories"
        ],
        listInstallationRequestsForAuthenticatedApp: [
          "GET /app/installation-requests"
        ],
        listInstallations: ["GET /app/installations"],
        listInstallationsForAuthenticatedUser: ["GET /user/installations"],
        listPlans: ["GET /marketplace_listing/plans"],
        listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
        listReposAccessibleToInstallation: ["GET /installation/repositories"],
        listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
        listSubscriptionsForAuthenticatedUserStubbed: [
          "GET /user/marketplace_purchases/stubbed"
        ],
        listWebhookDeliveries: ["GET /app/hook/deliveries"],
        redeliverWebhookDelivery: [
          "POST /app/hook/deliveries/{delivery_id}/attempts"
        ],
        removeRepoFromInstallation: [
          "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
          {},
          { renamed: ["apps", "removeRepoFromInstallationForAuthenticatedUser"] }
        ],
        removeRepoFromInstallationForAuthenticatedUser: [
          "DELETE /user/installations/{installation_id}/repositories/{repository_id}"
        ],
        resetToken: ["PATCH /applications/{client_id}/token"],
        revokeInstallationAccessToken: ["DELETE /installation/token"],
        scopeToken: ["POST /applications/{client_id}/token/scoped"],
        suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
        unsuspendInstallation: [
          "DELETE /app/installations/{installation_id}/suspended"
        ],
        updateWebhookConfigForApp: ["PATCH /app/hook/config"]
      },
      billing: {
        getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
        getGithubActionsBillingUser: [
          "GET /users/{username}/settings/billing/actions"
        ],
        getGithubBillingPremiumRequestUsageReportOrg: [
          "GET /organizations/{org}/settings/billing/premium_request/usage"
        ],
        getGithubBillingPremiumRequestUsageReportUser: [
          "GET /users/{username}/settings/billing/premium_request/usage"
        ],
        getGithubBillingUsageReportOrg: [
          "GET /organizations/{org}/settings/billing/usage"
        ],
        getGithubBillingUsageReportUser: [
          "GET /users/{username}/settings/billing/usage"
        ],
        getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
        getGithubPackagesBillingUser: [
          "GET /users/{username}/settings/billing/packages"
        ],
        getSharedStorageBillingOrg: [
          "GET /orgs/{org}/settings/billing/shared-storage"
        ],
        getSharedStorageBillingUser: [
          "GET /users/{username}/settings/billing/shared-storage"
        ]
      },
      campaigns: {
        createCampaign: ["POST /orgs/{org}/campaigns"],
        deleteCampaign: ["DELETE /orgs/{org}/campaigns/{campaign_number}"],
        getCampaignSummary: ["GET /orgs/{org}/campaigns/{campaign_number}"],
        listOrgCampaigns: ["GET /orgs/{org}/campaigns"],
        updateCampaign: ["PATCH /orgs/{org}/campaigns/{campaign_number}"]
      },
      checks: {
        create: ["POST /repos/{owner}/{repo}/check-runs"],
        createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
        get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
        getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
        listAnnotations: [
          "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations"
        ],
        listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
        listForSuite: [
          "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs"
        ],
        listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
        rerequestRun: [
          "POST /repos/{owner}/{repo}/check-runs/{check_run_id}/rerequest"
        ],
        rerequestSuite: [
          "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest"
        ],
        setSuitesPreferences: [
          "PATCH /repos/{owner}/{repo}/check-suites/preferences"
        ],
        update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"]
      },
      codeScanning: {
        commitAutofix: [
          "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix/commits"
        ],
        createAutofix: [
          "POST /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
        ],
        createVariantAnalysis: [
          "POST /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses"
        ],
        deleteAnalysis: [
          "DELETE /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}{?confirm_delete}"
        ],
        deleteCodeqlDatabase: [
          "DELETE /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
        ],
        getAlert: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
          {},
          { renamedParameters: { alert_id: "alert_number" } }
        ],
        getAnalysis: [
          "GET /repos/{owner}/{repo}/code-scanning/analyses/{analysis_id}"
        ],
        getAutofix: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/autofix"
        ],
        getCodeqlDatabase: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/databases/{language}"
        ],
        getDefaultSetup: ["GET /repos/{owner}/{repo}/code-scanning/default-setup"],
        getSarif: ["GET /repos/{owner}/{repo}/code-scanning/sarifs/{sarif_id}"],
        getVariantAnalysis: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}"
        ],
        getVariantAnalysisRepoTask: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/variant-analyses/{codeql_variant_analysis_id}/repos/{repo_owner}/{repo_name}"
        ],
        listAlertInstances: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances"
        ],
        listAlertsForOrg: ["GET /orgs/{org}/code-scanning/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
        listAlertsInstances: [
          "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}/instances",
          {},
          { renamed: ["codeScanning", "listAlertInstances"] }
        ],
        listCodeqlDatabases: [
          "GET /repos/{owner}/{repo}/code-scanning/codeql/databases"
        ],
        listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}"
        ],
        updateDefaultSetup: [
          "PATCH /repos/{owner}/{repo}/code-scanning/default-setup"
        ],
        uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"]
      },
      codeSecurity: {
        attachConfiguration: [
          "POST /orgs/{org}/code-security/configurations/{configuration_id}/attach"
        ],
        attachEnterpriseConfiguration: [
          "POST /enterprises/{enterprise}/code-security/configurations/{configuration_id}/attach"
        ],
        createConfiguration: ["POST /orgs/{org}/code-security/configurations"],
        createConfigurationForEnterprise: [
          "POST /enterprises/{enterprise}/code-security/configurations"
        ],
        deleteConfiguration: [
          "DELETE /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        deleteConfigurationForEnterprise: [
          "DELETE /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ],
        detachConfiguration: [
          "DELETE /orgs/{org}/code-security/configurations/detach"
        ],
        getConfiguration: [
          "GET /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        getConfigurationForRepository: [
          "GET /repos/{owner}/{repo}/code-security-configuration"
        ],
        getConfigurationsForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations"
        ],
        getConfigurationsForOrg: ["GET /orgs/{org}/code-security/configurations"],
        getDefaultConfigurations: [
          "GET /orgs/{org}/code-security/configurations/defaults"
        ],
        getDefaultConfigurationsForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations/defaults"
        ],
        getRepositoriesForConfiguration: [
          "GET /orgs/{org}/code-security/configurations/{configuration_id}/repositories"
        ],
        getRepositoriesForEnterpriseConfiguration: [
          "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}/repositories"
        ],
        getSingleConfigurationForEnterprise: [
          "GET /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ],
        setConfigurationAsDefault: [
          "PUT /orgs/{org}/code-security/configurations/{configuration_id}/defaults"
        ],
        setConfigurationAsDefaultForEnterprise: [
          "PUT /enterprises/{enterprise}/code-security/configurations/{configuration_id}/defaults"
        ],
        updateConfiguration: [
          "PATCH /orgs/{org}/code-security/configurations/{configuration_id}"
        ],
        updateEnterpriseConfiguration: [
          "PATCH /enterprises/{enterprise}/code-security/configurations/{configuration_id}"
        ]
      },
      codesOfConduct: {
        getAllCodesOfConduct: ["GET /codes_of_conduct"],
        getConductCode: ["GET /codes_of_conduct/{key}"]
      },
      codespaces: {
        addRepositoryForSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        checkPermissionsForDevcontainer: [
          "GET /repos/{owner}/{repo}/codespaces/permissions_check"
        ],
        codespaceMachinesForAuthenticatedUser: [
          "GET /user/codespaces/{codespace_name}/machines"
        ],
        createForAuthenticatedUser: ["POST /user/codespaces"],
        createOrUpdateOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}"
        ],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        createOrUpdateSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}"
        ],
        createWithPrForAuthenticatedUser: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/codespaces"
        ],
        createWithRepoForAuthenticatedUser: [
          "POST /repos/{owner}/{repo}/codespaces"
        ],
        deleteForAuthenticatedUser: ["DELETE /user/codespaces/{codespace_name}"],
        deleteFromOrganization: [
          "DELETE /orgs/{org}/members/{username}/codespaces/{codespace_name}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/codespaces/secrets/{secret_name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        deleteSecretForAuthenticatedUser: [
          "DELETE /user/codespaces/secrets/{secret_name}"
        ],
        exportForAuthenticatedUser: [
          "POST /user/codespaces/{codespace_name}/exports"
        ],
        getCodespacesForUserInOrg: [
          "GET /orgs/{org}/members/{username}/codespaces"
        ],
        getExportDetailsForAuthenticatedUser: [
          "GET /user/codespaces/{codespace_name}/exports/{export_id}"
        ],
        getForAuthenticatedUser: ["GET /user/codespaces/{codespace_name}"],
        getOrgPublicKey: ["GET /orgs/{org}/codespaces/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/codespaces/secrets/{secret_name}"],
        getPublicKeyForAuthenticatedUser: [
          "GET /user/codespaces/secrets/public-key"
        ],
        getRepoPublicKey: [
          "GET /repos/{owner}/{repo}/codespaces/secrets/public-key"
        ],
        getRepoSecret: [
          "GET /repos/{owner}/{repo}/codespaces/secrets/{secret_name}"
        ],
        getSecretForAuthenticatedUser: [
          "GET /user/codespaces/secrets/{secret_name}"
        ],
        listDevcontainersInRepositoryForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/devcontainers"
        ],
        listForAuthenticatedUser: ["GET /user/codespaces"],
        listInOrganization: [
          "GET /orgs/{org}/codespaces",
          {},
          { renamedParameters: { org_id: "org" } }
        ],
        listInRepositoryForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces"
        ],
        listOrgSecrets: ["GET /orgs/{org}/codespaces/secrets"],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/codespaces/secrets"],
        listRepositoriesForSecretForAuthenticatedUser: [
          "GET /user/codespaces/secrets/{secret_name}/repositories"
        ],
        listSecretsForAuthenticatedUser: ["GET /user/codespaces/secrets"],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
        ],
        preFlightWithRepoForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/new"
        ],
        publishForAuthenticatedUser: [
          "POST /user/codespaces/{codespace_name}/publish"
        ],
        removeRepositoryForSecretForAuthenticatedUser: [
          "DELETE /user/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/codespaces/secrets/{secret_name}/repositories/{repository_id}"
        ],
        repoMachinesForAuthenticatedUser: [
          "GET /repos/{owner}/{repo}/codespaces/machines"
        ],
        setRepositoriesForSecretForAuthenticatedUser: [
          "PUT /user/codespaces/secrets/{secret_name}/repositories"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/codespaces/secrets/{secret_name}/repositories"
        ],
        startForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/start"],
        stopForAuthenticatedUser: ["POST /user/codespaces/{codespace_name}/stop"],
        stopInOrganization: [
          "POST /orgs/{org}/members/{username}/codespaces/{codespace_name}/stop"
        ],
        updateForAuthenticatedUser: ["PATCH /user/codespaces/{codespace_name}"]
      },
      copilot: {
        addCopilotSeatsForTeams: [
          "POST /orgs/{org}/copilot/billing/selected_teams"
        ],
        addCopilotSeatsForUsers: [
          "POST /orgs/{org}/copilot/billing/selected_users"
        ],
        cancelCopilotSeatAssignmentForTeams: [
          "DELETE /orgs/{org}/copilot/billing/selected_teams"
        ],
        cancelCopilotSeatAssignmentForUsers: [
          "DELETE /orgs/{org}/copilot/billing/selected_users"
        ],
        copilotMetricsForOrganization: ["GET /orgs/{org}/copilot/metrics"],
        copilotMetricsForTeam: ["GET /orgs/{org}/team/{team_slug}/copilot/metrics"],
        getCopilotOrganizationDetails: ["GET /orgs/{org}/copilot/billing"],
        getCopilotSeatDetailsForUser: [
          "GET /orgs/{org}/members/{username}/copilot"
        ],
        listCopilotSeats: ["GET /orgs/{org}/copilot/billing/seats"]
      },
      credentials: { revoke: ["POST /credentials/revoke"] },
      dependabot: {
        addSelectedRepoToOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
        ],
        createOrUpdateOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}"
        ],
        createOrUpdateRepoSecret: [
          "PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        deleteOrgSecret: ["DELETE /orgs/{org}/dependabot/secrets/{secret_name}"],
        deleteRepoSecret: [
          "DELETE /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        getAlert: ["GET /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"],
        getOrgPublicKey: ["GET /orgs/{org}/dependabot/secrets/public-key"],
        getOrgSecret: ["GET /orgs/{org}/dependabot/secrets/{secret_name}"],
        getRepoPublicKey: [
          "GET /repos/{owner}/{repo}/dependabot/secrets/public-key"
        ],
        getRepoSecret: [
          "GET /repos/{owner}/{repo}/dependabot/secrets/{secret_name}"
        ],
        listAlertsForEnterprise: [
          "GET /enterprises/{enterprise}/dependabot/alerts"
        ],
        listAlertsForOrg: ["GET /orgs/{org}/dependabot/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/dependabot/alerts"],
        listOrgSecrets: ["GET /orgs/{org}/dependabot/secrets"],
        listRepoSecrets: ["GET /repos/{owner}/{repo}/dependabot/secrets"],
        listSelectedReposForOrgSecret: [
          "GET /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
        ],
        removeSelectedRepoFromOrgSecret: [
          "DELETE /orgs/{org}/dependabot/secrets/{secret_name}/repositories/{repository_id}"
        ],
        repositoryAccessForOrg: [
          "GET /organizations/{org}/dependabot/repository-access"
        ],
        setRepositoryAccessDefaultLevel: [
          "PUT /organizations/{org}/dependabot/repository-access/default-level"
        ],
        setSelectedReposForOrgSecret: [
          "PUT /orgs/{org}/dependabot/secrets/{secret_name}/repositories"
        ],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/dependabot/alerts/{alert_number}"
        ],
        updateRepositoryAccessForOrg: [
          "PATCH /organizations/{org}/dependabot/repository-access"
        ]
      },
      dependencyGraph: {
        createRepositorySnapshot: [
          "POST /repos/{owner}/{repo}/dependency-graph/snapshots"
        ],
        diffRange: [
          "GET /repos/{owner}/{repo}/dependency-graph/compare/{basehead}"
        ],
        exportSbom: ["GET /repos/{owner}/{repo}/dependency-graph/sbom"]
      },
      emojis: { get: ["GET /emojis"] },
      enterpriseTeamMemberships: {
        add: [
          "PUT /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ],
        bulkAdd: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/add"
        ],
        bulkRemove: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/memberships/remove"
        ],
        get: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ],
        list: ["GET /enterprises/{enterprise}/teams/{enterprise-team}/memberships"],
        remove: [
          "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/memberships/{username}"
        ]
      },
      enterpriseTeamOrganizations: {
        add: [
          "PUT /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        bulkAdd: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/add"
        ],
        bulkRemove: [
          "POST /enterprises/{enterprise}/teams/{enterprise-team}/organizations/remove"
        ],
        delete: [
          "DELETE /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        getAssignment: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations/{org}"
        ],
        getAssignments: [
          "GET /enterprises/{enterprise}/teams/{enterprise-team}/organizations"
        ]
      },
      enterpriseTeams: {
        create: ["POST /enterprises/{enterprise}/teams"],
        delete: ["DELETE /enterprises/{enterprise}/teams/{team_slug}"],
        get: ["GET /enterprises/{enterprise}/teams/{team_slug}"],
        list: ["GET /enterprises/{enterprise}/teams"],
        update: ["PATCH /enterprises/{enterprise}/teams/{team_slug}"]
      },
      gists: {
        checkIsStarred: ["GET /gists/{gist_id}/star"],
        create: ["POST /gists"],
        createComment: ["POST /gists/{gist_id}/comments"],
        delete: ["DELETE /gists/{gist_id}"],
        deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
        fork: ["POST /gists/{gist_id}/forks"],
        get: ["GET /gists/{gist_id}"],
        getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
        getRevision: ["GET /gists/{gist_id}/{sha}"],
        list: ["GET /gists"],
        listComments: ["GET /gists/{gist_id}/comments"],
        listCommits: ["GET /gists/{gist_id}/commits"],
        listForUser: ["GET /users/{username}/gists"],
        listForks: ["GET /gists/{gist_id}/forks"],
        listPublic: ["GET /gists/public"],
        listStarred: ["GET /gists/starred"],
        star: ["PUT /gists/{gist_id}/star"],
        unstar: ["DELETE /gists/{gist_id}/star"],
        update: ["PATCH /gists/{gist_id}"],
        updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"]
      },
      git: {
        createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
        createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
        createRef: ["POST /repos/{owner}/{repo}/git/refs"],
        createTag: ["POST /repos/{owner}/{repo}/git/tags"],
        createTree: ["POST /repos/{owner}/{repo}/git/trees"],
        deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
        getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
        getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
        getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
        getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
        getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
        listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
        updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"]
      },
      gitignore: {
        getAllTemplates: ["GET /gitignore/templates"],
        getTemplate: ["GET /gitignore/templates/{name}"]
      },
      hostedCompute: {
        createNetworkConfigurationForOrg: [
          "POST /orgs/{org}/settings/network-configurations"
        ],
        deleteNetworkConfigurationFromOrg: [
          "DELETE /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ],
        getNetworkConfigurationForOrg: [
          "GET /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ],
        getNetworkSettingsForOrg: [
          "GET /orgs/{org}/settings/network-settings/{network_settings_id}"
        ],
        listNetworkConfigurationsForOrg: [
          "GET /orgs/{org}/settings/network-configurations"
        ],
        updateNetworkConfigurationForOrg: [
          "PATCH /orgs/{org}/settings/network-configurations/{network_configuration_id}"
        ]
      },
      interactions: {
        getRestrictionsForAuthenticatedUser: ["GET /user/interaction-limits"],
        getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
        getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
        getRestrictionsForYourPublicRepos: [
          "GET /user/interaction-limits",
          {},
          { renamed: ["interactions", "getRestrictionsForAuthenticatedUser"] }
        ],
        removeRestrictionsForAuthenticatedUser: ["DELETE /user/interaction-limits"],
        removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
        removeRestrictionsForRepo: [
          "DELETE /repos/{owner}/{repo}/interaction-limits"
        ],
        removeRestrictionsForYourPublicRepos: [
          "DELETE /user/interaction-limits",
          {},
          { renamed: ["interactions", "removeRestrictionsForAuthenticatedUser"] }
        ],
        setRestrictionsForAuthenticatedUser: ["PUT /user/interaction-limits"],
        setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
        setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
        setRestrictionsForYourPublicRepos: [
          "PUT /user/interaction-limits",
          {},
          { renamed: ["interactions", "setRestrictionsForAuthenticatedUser"] }
        ]
      },
      issues: {
        addAssignees: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees"
        ],
        addBlockedByDependency: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
        ],
        addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        addSubIssue: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
        ],
        checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
        checkUserCanBeAssignedToIssue: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/assignees/{assignee}"
        ],
        create: ["POST /repos/{owner}/{repo}/issues"],
        createComment: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
        ],
        createLabel: ["POST /repos/{owner}/{repo}/labels"],
        createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
        deleteComment: [
          "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}"
        ],
        deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
        deleteMilestone: [
          "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}"
        ],
        get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
        getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
        getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
        getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
        getParent: ["GET /repos/{owner}/{repo}/issues/{issue_number}/parent"],
        list: ["GET /issues"],
        listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
        listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
        listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
        listDependenciesBlockedBy: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by"
        ],
        listDependenciesBlocking: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking"
        ],
        listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
        listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
        listEventsForTimeline: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline"
        ],
        listForAuthenticatedUser: ["GET /user/issues"],
        listForOrg: ["GET /orgs/{org}/issues"],
        listForRepo: ["GET /repos/{owner}/{repo}/issues"],
        listLabelsForMilestone: [
          "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels"
        ],
        listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
        listLabelsOnIssue: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/labels"
        ],
        listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
        listSubIssues: [
          "GET /repos/{owner}/{repo}/issues/{issue_number}/sub_issues"
        ],
        lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        removeAllLabels: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels"
        ],
        removeAssignees: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees"
        ],
        removeDependencyBlockedBy: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}"
        ],
        removeLabel: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}"
        ],
        removeSubIssue: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue"
        ],
        reprioritizeSubIssue: [
          "PATCH /repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority"
        ],
        setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
        unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
        update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
        updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
        updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
        updateMilestone: [
          "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}"
        ]
      },
      licenses: {
        get: ["GET /licenses/{license}"],
        getAllCommonlyUsed: ["GET /licenses"],
        getForRepo: ["GET /repos/{owner}/{repo}/license"]
      },
      markdown: {
        render: ["POST /markdown"],
        renderRaw: [
          "POST /markdown/raw",
          { headers: { "content-type": "text/plain; charset=utf-8" } }
        ]
      },
      meta: {
        get: ["GET /meta"],
        getAllVersions: ["GET /versions"],
        getOctocat: ["GET /octocat"],
        getZen: ["GET /zen"],
        root: ["GET /"]
      },
      migrations: {
        deleteArchiveForAuthenticatedUser: [
          "DELETE /user/migrations/{migration_id}/archive"
        ],
        deleteArchiveForOrg: [
          "DELETE /orgs/{org}/migrations/{migration_id}/archive"
        ],
        downloadArchiveForOrg: [
          "GET /orgs/{org}/migrations/{migration_id}/archive"
        ],
        getArchiveForAuthenticatedUser: [
          "GET /user/migrations/{migration_id}/archive"
        ],
        getStatusForAuthenticatedUser: ["GET /user/migrations/{migration_id}"],
        getStatusForOrg: ["GET /orgs/{org}/migrations/{migration_id}"],
        listForAuthenticatedUser: ["GET /user/migrations"],
        listForOrg: ["GET /orgs/{org}/migrations"],
        listReposForAuthenticatedUser: [
          "GET /user/migrations/{migration_id}/repositories"
        ],
        listReposForOrg: ["GET /orgs/{org}/migrations/{migration_id}/repositories"],
        listReposForUser: [
          "GET /user/migrations/{migration_id}/repositories",
          {},
          { renamed: ["migrations", "listReposForAuthenticatedUser"] }
        ],
        startForAuthenticatedUser: ["POST /user/migrations"],
        startForOrg: ["POST /orgs/{org}/migrations"],
        unlockRepoForAuthenticatedUser: [
          "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock"
        ],
        unlockRepoForOrg: [
          "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock"
        ]
      },
      oidc: {
        getOidcCustomSubTemplateForOrg: [
          "GET /orgs/{org}/actions/oidc/customization/sub"
        ],
        updateOidcCustomSubTemplateForOrg: [
          "PUT /orgs/{org}/actions/oidc/customization/sub"
        ]
      },
      orgs: {
        addSecurityManagerTeam: [
          "PUT /orgs/{org}/security-managers/teams/{team_slug}",
          {},
          {
            deprecated: "octokit.rest.orgs.addSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#add-a-security-manager-team"
          }
        ],
        assignTeamToOrgRole: [
          "PUT /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
        ],
        assignUserToOrgRole: [
          "PUT /orgs/{org}/organization-roles/users/{username}/{role_id}"
        ],
        blockUser: ["PUT /orgs/{org}/blocks/{username}"],
        cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
        checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
        checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
        checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
        convertMemberToOutsideCollaborator: [
          "PUT /orgs/{org}/outside_collaborators/{username}"
        ],
        createArtifactStorageRecord: [
          "POST /orgs/{org}/artifacts/metadata/storage-record"
        ],
        createInvitation: ["POST /orgs/{org}/invitations"],
        createIssueType: ["POST /orgs/{org}/issue-types"],
        createWebhook: ["POST /orgs/{org}/hooks"],
        customPropertiesForOrgsCreateOrUpdateOrganizationValues: [
          "PATCH /organizations/{org}/org-properties/values"
        ],
        customPropertiesForOrgsGetOrganizationValues: [
          "GET /organizations/{org}/org-properties/values"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationDefinition: [
          "PUT /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationDefinitions: [
          "PATCH /orgs/{org}/properties/schema"
        ],
        customPropertiesForReposCreateOrUpdateOrganizationValues: [
          "PATCH /orgs/{org}/properties/values"
        ],
        customPropertiesForReposDeleteOrganizationDefinition: [
          "DELETE /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposGetOrganizationDefinition: [
          "GET /orgs/{org}/properties/schema/{custom_property_name}"
        ],
        customPropertiesForReposGetOrganizationDefinitions: [
          "GET /orgs/{org}/properties/schema"
        ],
        customPropertiesForReposGetOrganizationValues: [
          "GET /orgs/{org}/properties/values"
        ],
        delete: ["DELETE /orgs/{org}"],
        deleteAttestationsBulk: ["POST /orgs/{org}/attestations/delete-request"],
        deleteAttestationsById: [
          "DELETE /orgs/{org}/attestations/{attestation_id}"
        ],
        deleteAttestationsBySubjectDigest: [
          "DELETE /orgs/{org}/attestations/digest/{subject_digest}"
        ],
        deleteIssueType: ["DELETE /orgs/{org}/issue-types/{issue_type_id}"],
        deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
        disableSelectedRepositoryImmutableReleasesOrganization: [
          "DELETE /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
        ],
        enableSelectedRepositoryImmutableReleasesOrganization: [
          "PUT /orgs/{org}/settings/immutable-releases/repositories/{repository_id}"
        ],
        get: ["GET /orgs/{org}"],
        getImmutableReleasesSettings: [
          "GET /orgs/{org}/settings/immutable-releases"
        ],
        getImmutableReleasesSettingsRepositories: [
          "GET /orgs/{org}/settings/immutable-releases/repositories"
        ],
        getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
        getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
        getOrgRole: ["GET /orgs/{org}/organization-roles/{role_id}"],
        getOrgRulesetHistory: ["GET /orgs/{org}/rulesets/{ruleset_id}/history"],
        getOrgRulesetVersion: [
          "GET /orgs/{org}/rulesets/{ruleset_id}/history/{version_id}"
        ],
        getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
        getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
        getWebhookDelivery: [
          "GET /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}"
        ],
        list: ["GET /organizations"],
        listAppInstallations: ["GET /orgs/{org}/installations"],
        listArtifactStorageRecords: [
          "GET /orgs/{org}/artifacts/{subject_digest}/metadata/storage-records"
        ],
        listAttestationRepositories: ["GET /orgs/{org}/attestations/repositories"],
        listAttestations: ["GET /orgs/{org}/attestations/{subject_digest}"],
        listAttestationsBulk: [
          "POST /orgs/{org}/attestations/bulk-list{?per_page,before,after}"
        ],
        listBlockedUsers: ["GET /orgs/{org}/blocks"],
        listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
        listForAuthenticatedUser: ["GET /user/orgs"],
        listForUser: ["GET /users/{username}/orgs"],
        listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
        listIssueTypes: ["GET /orgs/{org}/issue-types"],
        listMembers: ["GET /orgs/{org}/members"],
        listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
        listOrgRoleTeams: ["GET /orgs/{org}/organization-roles/{role_id}/teams"],
        listOrgRoleUsers: ["GET /orgs/{org}/organization-roles/{role_id}/users"],
        listOrgRoles: ["GET /orgs/{org}/organization-roles"],
        listOrganizationFineGrainedPermissions: [
          "GET /orgs/{org}/organization-fine-grained-permissions"
        ],
        listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
        listPatGrantRepositories: [
          "GET /orgs/{org}/personal-access-tokens/{pat_id}/repositories"
        ],
        listPatGrantRequestRepositories: [
          "GET /orgs/{org}/personal-access-token-requests/{pat_request_id}/repositories"
        ],
        listPatGrantRequests: ["GET /orgs/{org}/personal-access-token-requests"],
        listPatGrants: ["GET /orgs/{org}/personal-access-tokens"],
        listPendingInvitations: ["GET /orgs/{org}/invitations"],
        listPublicMembers: ["GET /orgs/{org}/public_members"],
        listSecurityManagerTeams: [
          "GET /orgs/{org}/security-managers",
          {},
          {
            deprecated: "octokit.rest.orgs.listSecurityManagerTeams() is deprecated, see https://docs.github.com/rest/orgs/security-managers#list-security-manager-teams"
          }
        ],
        listWebhookDeliveries: ["GET /orgs/{org}/hooks/{hook_id}/deliveries"],
        listWebhooks: ["GET /orgs/{org}/hooks"],
        pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
        redeliverWebhookDelivery: [
          "POST /orgs/{org}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
        ],
        removeMember: ["DELETE /orgs/{org}/members/{username}"],
        removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
        removeOutsideCollaborator: [
          "DELETE /orgs/{org}/outside_collaborators/{username}"
        ],
        removePublicMembershipForAuthenticatedUser: [
          "DELETE /orgs/{org}/public_members/{username}"
        ],
        removeSecurityManagerTeam: [
          "DELETE /orgs/{org}/security-managers/teams/{team_slug}",
          {},
          {
            deprecated: "octokit.rest.orgs.removeSecurityManagerTeam() is deprecated, see https://docs.github.com/rest/orgs/security-managers#remove-a-security-manager-team"
          }
        ],
        reviewPatGrantRequest: [
          "POST /orgs/{org}/personal-access-token-requests/{pat_request_id}"
        ],
        reviewPatGrantRequestsInBulk: [
          "POST /orgs/{org}/personal-access-token-requests"
        ],
        revokeAllOrgRolesTeam: [
          "DELETE /orgs/{org}/organization-roles/teams/{team_slug}"
        ],
        revokeAllOrgRolesUser: [
          "DELETE /orgs/{org}/organization-roles/users/{username}"
        ],
        revokeOrgRoleTeam: [
          "DELETE /orgs/{org}/organization-roles/teams/{team_slug}/{role_id}"
        ],
        revokeOrgRoleUser: [
          "DELETE /orgs/{org}/organization-roles/users/{username}/{role_id}"
        ],
        setImmutableReleasesSettings: [
          "PUT /orgs/{org}/settings/immutable-releases"
        ],
        setImmutableReleasesSettingsRepositories: [
          "PUT /orgs/{org}/settings/immutable-releases/repositories"
        ],
        setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
        setPublicMembershipForAuthenticatedUser: [
          "PUT /orgs/{org}/public_members/{username}"
        ],
        unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
        update: ["PATCH /orgs/{org}"],
        updateIssueType: ["PUT /orgs/{org}/issue-types/{issue_type_id}"],
        updateMembershipForAuthenticatedUser: [
          "PATCH /user/memberships/orgs/{org}"
        ],
        updatePatAccess: ["POST /orgs/{org}/personal-access-tokens/{pat_id}"],
        updatePatAccesses: ["POST /orgs/{org}/personal-access-tokens"],
        updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
        updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"]
      },
      packages: {
        deletePackageForAuthenticatedUser: [
          "DELETE /user/packages/{package_type}/{package_name}"
        ],
        deletePackageForOrg: [
          "DELETE /orgs/{org}/packages/{package_type}/{package_name}"
        ],
        deletePackageForUser: [
          "DELETE /users/{username}/packages/{package_type}/{package_name}"
        ],
        deletePackageVersionForAuthenticatedUser: [
          "DELETE /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        deletePackageVersionForOrg: [
          "DELETE /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        deletePackageVersionForUser: [
          "DELETE /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getAllPackageVersionsForAPackageOwnedByAnOrg: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions",
          {},
          { renamed: ["packages", "getAllPackageVersionsForPackageOwnedByOrg"] }
        ],
        getAllPackageVersionsForAPackageOwnedByTheAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions",
          {},
          {
            renamed: [
              "packages",
              "getAllPackageVersionsForPackageOwnedByAuthenticatedUser"
            ]
          }
        ],
        getAllPackageVersionsForPackageOwnedByAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions"
        ],
        getAllPackageVersionsForPackageOwnedByOrg: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions"
        ],
        getAllPackageVersionsForPackageOwnedByUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}/versions"
        ],
        getPackageForAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}"
        ],
        getPackageForOrganization: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}"
        ],
        getPackageForUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}"
        ],
        getPackageVersionForAuthenticatedUser: [
          "GET /user/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getPackageVersionForOrganization: [
          "GET /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        getPackageVersionForUser: [
          "GET /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}"
        ],
        listDockerMigrationConflictingPackagesForAuthenticatedUser: [
          "GET /user/docker/conflicts"
        ],
        listDockerMigrationConflictingPackagesForOrganization: [
          "GET /orgs/{org}/docker/conflicts"
        ],
        listDockerMigrationConflictingPackagesForUser: [
          "GET /users/{username}/docker/conflicts"
        ],
        listPackagesForAuthenticatedUser: ["GET /user/packages"],
        listPackagesForOrganization: ["GET /orgs/{org}/packages"],
        listPackagesForUser: ["GET /users/{username}/packages"],
        restorePackageForAuthenticatedUser: [
          "POST /user/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageForOrg: [
          "POST /orgs/{org}/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageForUser: [
          "POST /users/{username}/packages/{package_type}/{package_name}/restore{?token}"
        ],
        restorePackageVersionForAuthenticatedUser: [
          "POST /user/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ],
        restorePackageVersionForOrg: [
          "POST /orgs/{org}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ],
        restorePackageVersionForUser: [
          "POST /users/{username}/packages/{package_type}/{package_name}/versions/{package_version_id}/restore"
        ]
      },
      privateRegistries: {
        createOrgPrivateRegistry: ["POST /orgs/{org}/private-registries"],
        deleteOrgPrivateRegistry: [
          "DELETE /orgs/{org}/private-registries/{secret_name}"
        ],
        getOrgPrivateRegistry: ["GET /orgs/{org}/private-registries/{secret_name}"],
        getOrgPublicKey: ["GET /orgs/{org}/private-registries/public-key"],
        listOrgPrivateRegistries: ["GET /orgs/{org}/private-registries"],
        updateOrgPrivateRegistry: [
          "PATCH /orgs/{org}/private-registries/{secret_name}"
        ]
      },
      projects: {
        addItemForOrg: ["POST /orgs/{org}/projectsV2/{project_number}/items"],
        addItemForUser: [
          "POST /users/{username}/projectsV2/{project_number}/items"
        ],
        deleteItemForOrg: [
          "DELETE /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
        ],
        deleteItemForUser: [
          "DELETE /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ],
        getFieldForOrg: [
          "GET /orgs/{org}/projectsV2/{project_number}/fields/{field_id}"
        ],
        getFieldForUser: [
          "GET /users/{username}/projectsV2/{project_number}/fields/{field_id}"
        ],
        getForOrg: ["GET /orgs/{org}/projectsV2/{project_number}"],
        getForUser: ["GET /users/{username}/projectsV2/{project_number}"],
        getOrgItem: ["GET /orgs/{org}/projectsV2/{project_number}/items/{item_id}"],
        getUserItem: [
          "GET /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ],
        listFieldsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/fields"],
        listFieldsForUser: [
          "GET /users/{username}/projectsV2/{project_number}/fields"
        ],
        listForOrg: ["GET /orgs/{org}/projectsV2"],
        listForUser: ["GET /users/{username}/projectsV2"],
        listItemsForOrg: ["GET /orgs/{org}/projectsV2/{project_number}/items"],
        listItemsForUser: [
          "GET /users/{username}/projectsV2/{project_number}/items"
        ],
        updateItemForOrg: [
          "PATCH /orgs/{org}/projectsV2/{project_number}/items/{item_id}"
        ],
        updateItemForUser: [
          "PATCH /users/{username}/projectsV2/{project_number}/items/{item_id}"
        ]
      },
      pulls: {
        checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        create: ["POST /repos/{owner}/{repo}/pulls"],
        createReplyForReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies"
        ],
        createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        createReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments"
        ],
        deletePendingReview: [
          "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        deleteReviewComment: [
          "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}"
        ],
        dismissReview: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals"
        ],
        get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
        getReview: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
        list: ["GET /repos/{owner}/{repo}/pulls"],
        listCommentsForReview: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments"
        ],
        listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
        listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
        listRequestedReviewers: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        listReviewComments: [
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments"
        ],
        listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
        listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
        merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
        removeRequestedReviewers: [
          "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        requestReviewers: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers"
        ],
        submitReview: [
          "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events"
        ],
        update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
        updateBranch: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch"
        ],
        updateReview: [
          "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}"
        ],
        updateReviewComment: [
          "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}"
        ]
      },
      rateLimit: { get: ["GET /rate_limit"] },
      reactions: {
        createForCommitComment: [
          "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions"
        ],
        createForIssue: [
          "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions"
        ],
        createForIssueComment: [
          "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
        ],
        createForPullRequestReviewComment: [
          "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
        ],
        createForRelease: [
          "POST /repos/{owner}/{repo}/releases/{release_id}/reactions"
        ],
        createForTeamDiscussionCommentInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
        ],
        createForTeamDiscussionInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
        ],
        deleteForCommitComment: [
          "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForIssue: [
          "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}"
        ],
        deleteForIssueComment: [
          "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForPullRequestComment: [
          "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}"
        ],
        deleteForRelease: [
          "DELETE /repos/{owner}/{repo}/releases/{release_id}/reactions/{reaction_id}"
        ],
        deleteForTeamDiscussion: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}"
        ],
        deleteForTeamDiscussionComment: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}"
        ],
        listForCommitComment: [
          "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions"
        ],
        listForIssue: ["GET /repos/{owner}/{repo}/issues/{issue_number}/reactions"],
        listForIssueComment: [
          "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions"
        ],
        listForPullRequestReviewComment: [
          "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions"
        ],
        listForRelease: [
          "GET /repos/{owner}/{repo}/releases/{release_id}/reactions"
        ],
        listForTeamDiscussionCommentInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions"
        ],
        listForTeamDiscussionInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions"
        ]
      },
      repos: {
        acceptInvitation: [
          "PATCH /user/repository_invitations/{invitation_id}",
          {},
          { renamed: ["repos", "acceptInvitationForAuthenticatedUser"] }
        ],
        acceptInvitationForAuthenticatedUser: [
          "PATCH /user/repository_invitations/{invitation_id}"
        ],
        addAppAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
        addStatusCheckContexts: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        addTeamAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        addUserAccessRestrictions: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        cancelPagesDeployment: [
          "POST /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}/cancel"
        ],
        checkAutomatedSecurityFixes: [
          "GET /repos/{owner}/{repo}/automated-security-fixes"
        ],
        checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
        checkImmutableReleases: ["GET /repos/{owner}/{repo}/immutable-releases"],
        checkPrivateVulnerabilityReporting: [
          "GET /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        checkVulnerabilityAlerts: [
          "GET /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        codeownersErrors: ["GET /repos/{owner}/{repo}/codeowners/errors"],
        compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
        compareCommitsWithBasehead: [
          "GET /repos/{owner}/{repo}/compare/{basehead}"
        ],
        createAttestation: ["POST /repos/{owner}/{repo}/attestations"],
        createAutolink: ["POST /repos/{owner}/{repo}/autolinks"],
        createCommitComment: [
          "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments"
        ],
        createCommitSignatureProtection: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
        createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
        createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
        createDeploymentBranchPolicy: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
        ],
        createDeploymentProtectionRule: [
          "POST /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
        ],
        createDeploymentStatus: [
          "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
        ],
        createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
        createForAuthenticatedUser: ["POST /user/repos"],
        createFork: ["POST /repos/{owner}/{repo}/forks"],
        createInOrg: ["POST /orgs/{org}/repos"],
        createOrUpdateEnvironment: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
        createOrgRuleset: ["POST /orgs/{org}/rulesets"],
        createPagesDeployment: ["POST /repos/{owner}/{repo}/pages/deployments"],
        createPagesSite: ["POST /repos/{owner}/{repo}/pages"],
        createRelease: ["POST /repos/{owner}/{repo}/releases"],
        createRepoRuleset: ["POST /repos/{owner}/{repo}/rulesets"],
        createUsingTemplate: [
          "POST /repos/{template_owner}/{template_repo}/generate"
        ],
        createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
        customPropertiesForReposCreateOrUpdateRepositoryValues: [
          "PATCH /repos/{owner}/{repo}/properties/values"
        ],
        customPropertiesForReposGetRepositoryValues: [
          "GET /repos/{owner}/{repo}/properties/values"
        ],
        declineInvitation: [
          "DELETE /user/repository_invitations/{invitation_id}",
          {},
          { renamed: ["repos", "declineInvitationForAuthenticatedUser"] }
        ],
        declineInvitationForAuthenticatedUser: [
          "DELETE /user/repository_invitations/{invitation_id}"
        ],
        delete: ["DELETE /repos/{owner}/{repo}"],
        deleteAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
        ],
        deleteAdminBranchProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        deleteAnEnvironment: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        deleteAutolink: ["DELETE /repos/{owner}/{repo}/autolinks/{autolink_id}"],
        deleteBranchProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
        deleteCommitSignatureProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
        deleteDeployment: [
          "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}"
        ],
        deleteDeploymentBranchPolicy: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
        deleteInvitation: [
          "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}"
        ],
        deleteOrgRuleset: ["DELETE /orgs/{org}/rulesets/{ruleset_id}"],
        deletePagesSite: ["DELETE /repos/{owner}/{repo}/pages"],
        deletePullRequestReviewProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
        deleteReleaseAsset: [
          "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}"
        ],
        deleteRepoRuleset: ["DELETE /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
        disableAutomatedSecurityFixes: [
          "DELETE /repos/{owner}/{repo}/automated-security-fixes"
        ],
        disableDeploymentProtectionRule: [
          "DELETE /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
        ],
        disableImmutableReleases: [
          "DELETE /repos/{owner}/{repo}/immutable-releases"
        ],
        disablePrivateVulnerabilityReporting: [
          "DELETE /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        disableVulnerabilityAlerts: [
          "DELETE /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        downloadArchive: [
          "GET /repos/{owner}/{repo}/zipball/{ref}",
          {},
          { renamed: ["repos", "downloadZipballArchive"] }
        ],
        downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
        downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
        enableAutomatedSecurityFixes: [
          "PUT /repos/{owner}/{repo}/automated-security-fixes"
        ],
        enableImmutableReleases: ["PUT /repos/{owner}/{repo}/immutable-releases"],
        enablePrivateVulnerabilityReporting: [
          "PUT /repos/{owner}/{repo}/private-vulnerability-reporting"
        ],
        enableVulnerabilityAlerts: [
          "PUT /repos/{owner}/{repo}/vulnerability-alerts"
        ],
        generateReleaseNotes: [
          "POST /repos/{owner}/{repo}/releases/generate-notes"
        ],
        get: ["GET /repos/{owner}/{repo}"],
        getAccessRestrictions: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions"
        ],
        getAdminBranchProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        getAllDeploymentProtectionRules: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules"
        ],
        getAllEnvironments: ["GET /repos/{owner}/{repo}/environments"],
        getAllStatusCheckContexts: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts"
        ],
        getAllTopics: ["GET /repos/{owner}/{repo}/topics"],
        getAppsWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps"
        ],
        getAutolink: ["GET /repos/{owner}/{repo}/autolinks/{autolink_id}"],
        getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
        getBranchProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        getBranchRules: ["GET /repos/{owner}/{repo}/rules/branches/{branch}"],
        getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
        getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
        getCollaboratorPermissionLevel: [
          "GET /repos/{owner}/{repo}/collaborators/{username}/permission"
        ],
        getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
        getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
        getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
        getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
        getCommitSignatureProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures"
        ],
        getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
        getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
        getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
        getCustomDeploymentProtectionRule: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/{protection_rule_id}"
        ],
        getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
        getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
        getDeploymentBranchPolicy: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        getDeploymentStatus: [
          "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}"
        ],
        getEnvironment: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}"
        ],
        getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
        getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
        getOrgRuleSuite: ["GET /orgs/{org}/rulesets/rule-suites/{rule_suite_id}"],
        getOrgRuleSuites: ["GET /orgs/{org}/rulesets/rule-suites"],
        getOrgRuleset: ["GET /orgs/{org}/rulesets/{ruleset_id}"],
        getOrgRulesets: ["GET /orgs/{org}/rulesets"],
        getPages: ["GET /repos/{owner}/{repo}/pages"],
        getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
        getPagesDeployment: [
          "GET /repos/{owner}/{repo}/pages/deployments/{pages_deployment_id}"
        ],
        getPagesHealthCheck: ["GET /repos/{owner}/{repo}/pages/health"],
        getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
        getPullRequestReviewProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
        getReadme: ["GET /repos/{owner}/{repo}/readme"],
        getReadmeInDirectory: ["GET /repos/{owner}/{repo}/readme/{dir}"],
        getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
        getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
        getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
        getRepoRuleSuite: [
          "GET /repos/{owner}/{repo}/rulesets/rule-suites/{rule_suite_id}"
        ],
        getRepoRuleSuites: ["GET /repos/{owner}/{repo}/rulesets/rule-suites"],
        getRepoRuleset: ["GET /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        getRepoRulesetHistory: [
          "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history"
        ],
        getRepoRulesetVersion: [
          "GET /repos/{owner}/{repo}/rulesets/{ruleset_id}/history/{version_id}"
        ],
        getRepoRulesets: ["GET /repos/{owner}/{repo}/rulesets"],
        getStatusChecksProtection: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        getTeamsWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams"
        ],
        getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
        getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
        getUsersWithAccessToProtectedBranch: [
          "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users"
        ],
        getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
        getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
        getWebhookConfigForRepo: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/config"
        ],
        getWebhookDelivery: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}"
        ],
        listActivities: ["GET /repos/{owner}/{repo}/activity"],
        listAttestations: [
          "GET /repos/{owner}/{repo}/attestations/{subject_digest}"
        ],
        listAutolinks: ["GET /repos/{owner}/{repo}/autolinks"],
        listBranches: ["GET /repos/{owner}/{repo}/branches"],
        listBranchesForHeadCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head"
        ],
        listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
        listCommentsForCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments"
        ],
        listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
        listCommitStatusesForRef: [
          "GET /repos/{owner}/{repo}/commits/{ref}/statuses"
        ],
        listCommits: ["GET /repos/{owner}/{repo}/commits"],
        listContributors: ["GET /repos/{owner}/{repo}/contributors"],
        listCustomDeploymentRuleIntegrations: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment_protection_rules/apps"
        ],
        listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
        listDeploymentBranchPolicies: [
          "GET /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies"
        ],
        listDeploymentStatuses: [
          "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses"
        ],
        listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
        listForAuthenticatedUser: ["GET /user/repos"],
        listForOrg: ["GET /orgs/{org}/repos"],
        listForUser: ["GET /users/{username}/repos"],
        listForks: ["GET /repos/{owner}/{repo}/forks"],
        listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
        listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
        listLanguages: ["GET /repos/{owner}/{repo}/languages"],
        listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
        listPublic: ["GET /repositories"],
        listPullRequestsAssociatedWithCommit: [
          "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls"
        ],
        listReleaseAssets: [
          "GET /repos/{owner}/{repo}/releases/{release_id}/assets"
        ],
        listReleases: ["GET /repos/{owner}/{repo}/releases"],
        listTags: ["GET /repos/{owner}/{repo}/tags"],
        listTeams: ["GET /repos/{owner}/{repo}/teams"],
        listWebhookDeliveries: [
          "GET /repos/{owner}/{repo}/hooks/{hook_id}/deliveries"
        ],
        listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
        merge: ["POST /repos/{owner}/{repo}/merges"],
        mergeUpstream: ["POST /repos/{owner}/{repo}/merge-upstream"],
        pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
        redeliverWebhookDelivery: [
          "POST /repos/{owner}/{repo}/hooks/{hook_id}/deliveries/{delivery_id}/attempts"
        ],
        removeAppAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        removeCollaborator: [
          "DELETE /repos/{owner}/{repo}/collaborators/{username}"
        ],
        removeStatusCheckContexts: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        removeStatusCheckProtection: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        removeTeamAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        removeUserAccessRestrictions: [
          "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
        replaceAllTopics: ["PUT /repos/{owner}/{repo}/topics"],
        requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
        setAdminBranchProtection: [
          "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins"
        ],
        setAppAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
          {},
          { mapToData: "apps" }
        ],
        setStatusCheckContexts: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
          {},
          { mapToData: "contexts" }
        ],
        setTeamAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
          {},
          { mapToData: "teams" }
        ],
        setUserAccessRestrictions: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
          {},
          { mapToData: "users" }
        ],
        testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
        transfer: ["POST /repos/{owner}/{repo}/transfer"],
        update: ["PATCH /repos/{owner}/{repo}"],
        updateBranchProtection: [
          "PUT /repos/{owner}/{repo}/branches/{branch}/protection"
        ],
        updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
        updateDeploymentBranchPolicy: [
          "PUT /repos/{owner}/{repo}/environments/{environment_name}/deployment-branch-policies/{branch_policy_id}"
        ],
        updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
        updateInvitation: [
          "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}"
        ],
        updateOrgRuleset: ["PUT /orgs/{org}/rulesets/{ruleset_id}"],
        updatePullRequestReviewProtection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews"
        ],
        updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
        updateReleaseAsset: [
          "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}"
        ],
        updateRepoRuleset: ["PUT /repos/{owner}/{repo}/rulesets/{ruleset_id}"],
        updateStatusCheckPotection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
          {},
          { renamed: ["repos", "updateStatusCheckProtection"] }
        ],
        updateStatusCheckProtection: [
          "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks"
        ],
        updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
        updateWebhookConfigForRepo: [
          "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config"
        ],
        uploadReleaseAsset: [
          "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
          { baseUrl: "https://uploads.github.com" }
        ]
      },
      search: {
        code: ["GET /search/code"],
        commits: ["GET /search/commits"],
        issuesAndPullRequests: ["GET /search/issues"],
        labels: ["GET /search/labels"],
        repos: ["GET /search/repositories"],
        topics: ["GET /search/topics"],
        users: ["GET /search/users"]
      },
      secretScanning: {
        createPushProtectionBypass: [
          "POST /repos/{owner}/{repo}/secret-scanning/push-protection-bypasses"
        ],
        getAlert: [
          "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
        ],
        getScanHistory: ["GET /repos/{owner}/{repo}/secret-scanning/scan-history"],
        listAlertsForOrg: ["GET /orgs/{org}/secret-scanning/alerts"],
        listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
        listLocationsForAlert: [
          "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}/locations"
        ],
        listOrgPatternConfigs: [
          "GET /orgs/{org}/secret-scanning/pattern-configurations"
        ],
        updateAlert: [
          "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}"
        ],
        updateOrgPatternConfigs: [
          "PATCH /orgs/{org}/secret-scanning/pattern-configurations"
        ]
      },
      securityAdvisories: {
        createFork: [
          "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/forks"
        ],
        createPrivateVulnerabilityReport: [
          "POST /repos/{owner}/{repo}/security-advisories/reports"
        ],
        createRepositoryAdvisory: [
          "POST /repos/{owner}/{repo}/security-advisories"
        ],
        createRepositoryAdvisoryCveRequest: [
          "POST /repos/{owner}/{repo}/security-advisories/{ghsa_id}/cve"
        ],
        getGlobalAdvisory: ["GET /advisories/{ghsa_id}"],
        getRepositoryAdvisory: [
          "GET /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
        ],
        listGlobalAdvisories: ["GET /advisories"],
        listOrgRepositoryAdvisories: ["GET /orgs/{org}/security-advisories"],
        listRepositoryAdvisories: ["GET /repos/{owner}/{repo}/security-advisories"],
        updateRepositoryAdvisory: [
          "PATCH /repos/{owner}/{repo}/security-advisories/{ghsa_id}"
        ]
      },
      teams: {
        addOrUpdateMembershipForUserInOrg: [
          "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        addOrUpdateRepoPermissionsInOrg: [
          "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        checkPermissionsForRepoInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        create: ["POST /orgs/{org}/teams"],
        createDiscussionCommentInOrg: [
          "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
        ],
        createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
        deleteDiscussionCommentInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        deleteDiscussionInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
        getByName: ["GET /orgs/{org}/teams/{team_slug}"],
        getDiscussionCommentInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        getDiscussionInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        getMembershipForUserInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        list: ["GET /orgs/{org}/teams"],
        listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
        listDiscussionCommentsInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments"
        ],
        listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
        listForAuthenticatedUser: ["GET /user/teams"],
        listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
        listPendingInvitationsInOrg: [
          "GET /orgs/{org}/teams/{team_slug}/invitations"
        ],
        listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
        removeMembershipForUserInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}"
        ],
        removeRepoInOrg: [
          "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}"
        ],
        updateDiscussionCommentInOrg: [
          "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}"
        ],
        updateDiscussionInOrg: [
          "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}"
        ],
        updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"]
      },
      users: {
        addEmailForAuthenticated: [
          "POST /user/emails",
          {},
          { renamed: ["users", "addEmailForAuthenticatedUser"] }
        ],
        addEmailForAuthenticatedUser: ["POST /user/emails"],
        addSocialAccountForAuthenticatedUser: ["POST /user/social_accounts"],
        block: ["PUT /user/blocks/{username}"],
        checkBlocked: ["GET /user/blocks/{username}"],
        checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
        checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
        createGpgKeyForAuthenticated: [
          "POST /user/gpg_keys",
          {},
          { renamed: ["users", "createGpgKeyForAuthenticatedUser"] }
        ],
        createGpgKeyForAuthenticatedUser: ["POST /user/gpg_keys"],
        createPublicSshKeyForAuthenticated: [
          "POST /user/keys",
          {},
          { renamed: ["users", "createPublicSshKeyForAuthenticatedUser"] }
        ],
        createPublicSshKeyForAuthenticatedUser: ["POST /user/keys"],
        createSshSigningKeyForAuthenticatedUser: ["POST /user/ssh_signing_keys"],
        deleteAttestationsBulk: [
          "POST /users/{username}/attestations/delete-request"
        ],
        deleteAttestationsById: [
          "DELETE /users/{username}/attestations/{attestation_id}"
        ],
        deleteAttestationsBySubjectDigest: [
          "DELETE /users/{username}/attestations/digest/{subject_digest}"
        ],
        deleteEmailForAuthenticated: [
          "DELETE /user/emails",
          {},
          { renamed: ["users", "deleteEmailForAuthenticatedUser"] }
        ],
        deleteEmailForAuthenticatedUser: ["DELETE /user/emails"],
        deleteGpgKeyForAuthenticated: [
          "DELETE /user/gpg_keys/{gpg_key_id}",
          {},
          { renamed: ["users", "deleteGpgKeyForAuthenticatedUser"] }
        ],
        deleteGpgKeyForAuthenticatedUser: ["DELETE /user/gpg_keys/{gpg_key_id}"],
        deletePublicSshKeyForAuthenticated: [
          "DELETE /user/keys/{key_id}",
          {},
          { renamed: ["users", "deletePublicSshKeyForAuthenticatedUser"] }
        ],
        deletePublicSshKeyForAuthenticatedUser: ["DELETE /user/keys/{key_id}"],
        deleteSocialAccountForAuthenticatedUser: ["DELETE /user/social_accounts"],
        deleteSshSigningKeyForAuthenticatedUser: [
          "DELETE /user/ssh_signing_keys/{ssh_signing_key_id}"
        ],
        follow: ["PUT /user/following/{username}"],
        getAuthenticated: ["GET /user"],
        getById: ["GET /user/{account_id}"],
        getByUsername: ["GET /users/{username}"],
        getContextForUser: ["GET /users/{username}/hovercard"],
        getGpgKeyForAuthenticated: [
          "GET /user/gpg_keys/{gpg_key_id}",
          {},
          { renamed: ["users", "getGpgKeyForAuthenticatedUser"] }
        ],
        getGpgKeyForAuthenticatedUser: ["GET /user/gpg_keys/{gpg_key_id}"],
        getPublicSshKeyForAuthenticated: [
          "GET /user/keys/{key_id}",
          {},
          { renamed: ["users", "getPublicSshKeyForAuthenticatedUser"] }
        ],
        getPublicSshKeyForAuthenticatedUser: ["GET /user/keys/{key_id}"],
        getSshSigningKeyForAuthenticatedUser: [
          "GET /user/ssh_signing_keys/{ssh_signing_key_id}"
        ],
        list: ["GET /users"],
        listAttestations: ["GET /users/{username}/attestations/{subject_digest}"],
        listAttestationsBulk: [
          "POST /users/{username}/attestations/bulk-list{?per_page,before,after}"
        ],
        listBlockedByAuthenticated: [
          "GET /user/blocks",
          {},
          { renamed: ["users", "listBlockedByAuthenticatedUser"] }
        ],
        listBlockedByAuthenticatedUser: ["GET /user/blocks"],
        listEmailsForAuthenticated: [
          "GET /user/emails",
          {},
          { renamed: ["users", "listEmailsForAuthenticatedUser"] }
        ],
        listEmailsForAuthenticatedUser: ["GET /user/emails"],
        listFollowedByAuthenticated: [
          "GET /user/following",
          {},
          { renamed: ["users", "listFollowedByAuthenticatedUser"] }
        ],
        listFollowedByAuthenticatedUser: ["GET /user/following"],
        listFollowersForAuthenticatedUser: ["GET /user/followers"],
        listFollowersForUser: ["GET /users/{username}/followers"],
        listFollowingForUser: ["GET /users/{username}/following"],
        listGpgKeysForAuthenticated: [
          "GET /user/gpg_keys",
          {},
          { renamed: ["users", "listGpgKeysForAuthenticatedUser"] }
        ],
        listGpgKeysForAuthenticatedUser: ["GET /user/gpg_keys"],
        listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
        listPublicEmailsForAuthenticated: [
          "GET /user/public_emails",
          {},
          { renamed: ["users", "listPublicEmailsForAuthenticatedUser"] }
        ],
        listPublicEmailsForAuthenticatedUser: ["GET /user/public_emails"],
        listPublicKeysForUser: ["GET /users/{username}/keys"],
        listPublicSshKeysForAuthenticated: [
          "GET /user/keys",
          {},
          { renamed: ["users", "listPublicSshKeysForAuthenticatedUser"] }
        ],
        listPublicSshKeysForAuthenticatedUser: ["GET /user/keys"],
        listSocialAccountsForAuthenticatedUser: ["GET /user/social_accounts"],
        listSocialAccountsForUser: ["GET /users/{username}/social_accounts"],
        listSshSigningKeysForAuthenticatedUser: ["GET /user/ssh_signing_keys"],
        listSshSigningKeysForUser: ["GET /users/{username}/ssh_signing_keys"],
        setPrimaryEmailVisibilityForAuthenticated: [
          "PATCH /user/email/visibility",
          {},
          { renamed: ["users", "setPrimaryEmailVisibilityForAuthenticatedUser"] }
        ],
        setPrimaryEmailVisibilityForAuthenticatedUser: [
          "PATCH /user/email/visibility"
        ],
        unblock: ["DELETE /user/blocks/{username}"],
        unfollow: ["DELETE /user/following/{username}"],
        updateAuthenticated: ["PATCH /user"]
      }
    };
    endpoints_default = Endpoints;
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js
function endpointsToMethods(octokit) {
  const newMethods = {};
  for (const scope of endpointMethodsMap.keys()) {
    newMethods[scope] = new Proxy({ octokit, scope, cache: {} }, handler);
  }
  return newMethods;
}
function decorate(octokit, scope, methodName, defaults, decorations) {
  const requestWithDefaults = octokit.request.defaults(defaults);
  function withDecorations(...args) {
    let options = requestWithDefaults.endpoint.merge(...args);
    if (decorations.mapToData) {
      options = Object.assign({}, options, {
        data: options[decorations.mapToData],
        [decorations.mapToData]: void 0
      });
      return requestWithDefaults(options);
    }
    if (decorations.renamed) {
      const [newScope, newMethodName] = decorations.renamed;
      octokit.log.warn(
        `octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`
      );
    }
    if (decorations.deprecated) {
      octokit.log.warn(decorations.deprecated);
    }
    if (decorations.renamedParameters) {
      const options2 = requestWithDefaults.endpoint.merge(...args);
      for (const [name, alias] of Object.entries(
        decorations.renamedParameters
      )) {
        if (name in options2) {
          octokit.log.warn(
            `"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`
          );
          if (!(alias in options2)) {
            options2[alias] = options2[name];
          }
          delete options2[name];
        }
      }
      return requestWithDefaults(options2);
    }
    return requestWithDefaults(...args);
  }
  return Object.assign(withDecorations, requestWithDefaults);
}
var endpointMethodsMap, handler;
var init_endpoints_to_methods = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/endpoints-to-methods.js"() {
    "use strict";
    init_esm_shims();
    init_endpoints();
    endpointMethodsMap = /* @__PURE__ */ new Map();
    for (const [scope, endpoints] of Object.entries(endpoints_default)) {
      for (const [methodName, endpoint3] of Object.entries(endpoints)) {
        const [route, defaults, decorations] = endpoint3;
        const [method, url] = route.split(/ /);
        const endpointDefaults = Object.assign(
          {
            method,
            url
          },
          defaults
        );
        if (!endpointMethodsMap.has(scope)) {
          endpointMethodsMap.set(scope, /* @__PURE__ */ new Map());
        }
        endpointMethodsMap.get(scope).set(methodName, {
          scope,
          methodName,
          endpointDefaults,
          decorations
        });
      }
    }
    handler = {
      has({ scope }, methodName) {
        return endpointMethodsMap.get(scope).has(methodName);
      },
      getOwnPropertyDescriptor(target, methodName) {
        return {
          value: this.get(target, methodName),
          // ensures method is in the cache
          configurable: true,
          writable: true,
          enumerable: true
        };
      },
      defineProperty(target, methodName, descriptor) {
        Object.defineProperty(target.cache, methodName, descriptor);
        return true;
      },
      deleteProperty(target, methodName) {
        delete target.cache[methodName];
        return true;
      },
      ownKeys({ scope }) {
        return [...endpointMethodsMap.get(scope).keys()];
      },
      set(target, methodName, value) {
        return target.cache[methodName] = value;
      },
      get({ octokit, scope, cache }, methodName) {
        if (cache[methodName]) {
          return cache[methodName];
        }
        const method = endpointMethodsMap.get(scope).get(methodName);
        if (!method) {
          return void 0;
        }
        const { endpointDefaults, decorations } = method;
        if (decorations) {
          cache[methodName] = decorate(
            octokit,
            scope,
            methodName,
            endpointDefaults,
            decorations
          );
        } else {
          cache[methodName] = octokit.request.defaults(endpointDefaults);
        }
        return cache[methodName];
      }
    };
  }
});

// node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js
function restEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    rest: api
  };
}
function legacyRestEndpointMethods(octokit) {
  const api = endpointsToMethods(octokit);
  return {
    ...api,
    rest: api
  };
}
var init_dist_src4 = __esm({
  "node_modules/@octokit/plugin-rest-endpoint-methods/dist-src/index.js"() {
    "use strict";
    init_esm_shims();
    init_version2();
    init_endpoints_to_methods();
    restEndpointMethods.VERSION = VERSION8;
    legacyRestEndpointMethods.VERSION = VERSION8;
  }
});

// node_modules/bottleneck/light.js
var require_light = __commonJS({
  "node_modules/bottleneck/light.js"(exports, module) {
    "use strict";
    init_esm_shims();
    (function(global2, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global2.Bottleneck = factory();
    })(exports, (function() {
      "use strict";
      var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
      function getCjsExportFromNamespace(n) {
        return n && n["default"] || n;
      }
      var load = function(received, defaults, onto = {}) {
        var k, ref, v;
        for (k in defaults) {
          v = defaults[k];
          onto[k] = (ref = received[k]) != null ? ref : v;
        }
        return onto;
      };
      var overwrite = function(received, defaults, onto = {}) {
        var k, v;
        for (k in received) {
          v = received[k];
          if (defaults[k] !== void 0) {
            onto[k] = v;
          }
        }
        return onto;
      };
      var parser = {
        load,
        overwrite
      };
      var DLList;
      DLList = class DLList {
        constructor(incr, decr) {
          this.incr = incr;
          this.decr = decr;
          this._first = null;
          this._last = null;
          this.length = 0;
        }
        push(value) {
          var node;
          this.length++;
          if (typeof this.incr === "function") {
            this.incr();
          }
          node = {
            value,
            prev: this._last,
            next: null
          };
          if (this._last != null) {
            this._last.next = node;
            this._last = node;
          } else {
            this._first = this._last = node;
          }
          return void 0;
        }
        shift() {
          var value;
          if (this._first == null) {
            return;
          } else {
            this.length--;
            if (typeof this.decr === "function") {
              this.decr();
            }
          }
          value = this._first.value;
          if ((this._first = this._first.next) != null) {
            this._first.prev = null;
          } else {
            this._last = null;
          }
          return value;
        }
        first() {
          if (this._first != null) {
            return this._first.value;
          }
        }
        getArray() {
          var node, ref, results;
          node = this._first;
          results = [];
          while (node != null) {
            results.push((ref = node, node = node.next, ref.value));
          }
          return results;
        }
        forEachShift(cb) {
          var node;
          node = this.shift();
          while (node != null) {
            cb(node), node = this.shift();
          }
          return void 0;
        }
        debug() {
          var node, ref, ref1, ref2, results;
          node = this._first;
          results = [];
          while (node != null) {
            results.push((ref = node, node = node.next, {
              value: ref.value,
              prev: (ref1 = ref.prev) != null ? ref1.value : void 0,
              next: (ref2 = ref.next) != null ? ref2.value : void 0
            }));
          }
          return results;
        }
      };
      var DLList_1 = DLList;
      var Events;
      Events = class Events {
        constructor(instance) {
          this.instance = instance;
          this._events = {};
          if (this.instance.on != null || this.instance.once != null || this.instance.removeAllListeners != null) {
            throw new Error("An Emitter already exists for this object");
          }
          this.instance.on = (name, cb) => {
            return this._addListener(name, "many", cb);
          };
          this.instance.once = (name, cb) => {
            return this._addListener(name, "once", cb);
          };
          this.instance.removeAllListeners = (name = null) => {
            if (name != null) {
              return delete this._events[name];
            } else {
              return this._events = {};
            }
          };
        }
        _addListener(name, status, cb) {
          var base;
          if ((base = this._events)[name] == null) {
            base[name] = [];
          }
          this._events[name].push({ cb, status });
          return this.instance;
        }
        listenerCount(name) {
          if (this._events[name] != null) {
            return this._events[name].length;
          } else {
            return 0;
          }
        }
        async trigger(name, ...args) {
          var e, promises;
          try {
            if (name !== "debug") {
              this.trigger("debug", `Event triggered: ${name}`, args);
            }
            if (this._events[name] == null) {
              return;
            }
            this._events[name] = this._events[name].filter(function(listener) {
              return listener.status !== "none";
            });
            promises = this._events[name].map(async (listener) => {
              var e2, returned;
              if (listener.status === "none") {
                return;
              }
              if (listener.status === "once") {
                listener.status = "none";
              }
              try {
                returned = typeof listener.cb === "function" ? listener.cb(...args) : void 0;
                if (typeof (returned != null ? returned.then : void 0) === "function") {
                  return await returned;
                } else {
                  return returned;
                }
              } catch (error) {
                e2 = error;
                {
                  this.trigger("error", e2);
                }
                return null;
              }
            });
            return (await Promise.all(promises)).find(function(x) {
              return x != null;
            });
          } catch (error) {
            e = error;
            {
              this.trigger("error", e);
            }
            return null;
          }
        }
      };
      var Events_1 = Events;
      var DLList$1, Events$1, Queues;
      DLList$1 = DLList_1;
      Events$1 = Events_1;
      Queues = class Queues {
        constructor(num_priorities) {
          var i;
          this.Events = new Events$1(this);
          this._length = 0;
          this._lists = (function() {
            var j, ref, results;
            results = [];
            for (i = j = 1, ref = num_priorities; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
              results.push(new DLList$1((() => {
                return this.incr();
              }), (() => {
                return this.decr();
              })));
            }
            return results;
          }).call(this);
        }
        incr() {
          if (this._length++ === 0) {
            return this.Events.trigger("leftzero");
          }
        }
        decr() {
          if (--this._length === 0) {
            return this.Events.trigger("zero");
          }
        }
        push(job) {
          return this._lists[job.options.priority].push(job);
        }
        queued(priority) {
          if (priority != null) {
            return this._lists[priority].length;
          } else {
            return this._length;
          }
        }
        shiftAll(fn) {
          return this._lists.forEach(function(list) {
            return list.forEachShift(fn);
          });
        }
        getFirst(arr = this._lists) {
          var j, len, list;
          for (j = 0, len = arr.length; j < len; j++) {
            list = arr[j];
            if (list.length > 0) {
              return list;
            }
          }
          return [];
        }
        shiftLastFrom(priority) {
          return this.getFirst(this._lists.slice(priority).reverse()).shift();
        }
      };
      var Queues_1 = Queues;
      var BottleneckError;
      BottleneckError = class BottleneckError extends Error {
      };
      var BottleneckError_1 = BottleneckError;
      var BottleneckError$1, DEFAULT_PRIORITY, Job, NUM_PRIORITIES, parser$1;
      NUM_PRIORITIES = 10;
      DEFAULT_PRIORITY = 5;
      parser$1 = parser;
      BottleneckError$1 = BottleneckError_1;
      Job = class Job {
        constructor(task, args, options, jobDefaults, rejectOnDrop, Events2, _states, Promise2) {
          this.task = task;
          this.args = args;
          this.rejectOnDrop = rejectOnDrop;
          this.Events = Events2;
          this._states = _states;
          this.Promise = Promise2;
          this.options = parser$1.load(options, jobDefaults);
          this.options.priority = this._sanitizePriority(this.options.priority);
          if (this.options.id === jobDefaults.id) {
            this.options.id = `${this.options.id}-${this._randomIndex()}`;
          }
          this.promise = new this.Promise((_resolve, _reject) => {
            this._resolve = _resolve;
            this._reject = _reject;
          });
          this.retryCount = 0;
        }
        _sanitizePriority(priority) {
          var sProperty;
          sProperty = ~~priority !== priority ? DEFAULT_PRIORITY : priority;
          if (sProperty < 0) {
            return 0;
          } else if (sProperty > NUM_PRIORITIES - 1) {
            return NUM_PRIORITIES - 1;
          } else {
            return sProperty;
          }
        }
        _randomIndex() {
          return Math.random().toString(36).slice(2);
        }
        doDrop({ error, message = "This job has been dropped by Bottleneck" } = {}) {
          if (this._states.remove(this.options.id)) {
            if (this.rejectOnDrop) {
              this._reject(error != null ? error : new BottleneckError$1(message));
            }
            this.Events.trigger("dropped", { args: this.args, options: this.options, task: this.task, promise: this.promise });
            return true;
          } else {
            return false;
          }
        }
        _assertStatus(expected) {
          var status;
          status = this._states.jobStatus(this.options.id);
          if (!(status === expected || expected === "DONE" && status === null)) {
            throw new BottleneckError$1(`Invalid job status ${status}, expected ${expected}. Please open an issue at https://github.com/SGrondin/bottleneck/issues`);
          }
        }
        doReceive() {
          this._states.start(this.options.id);
          return this.Events.trigger("received", { args: this.args, options: this.options });
        }
        doQueue(reachedHWM, blocked) {
          this._assertStatus("RECEIVED");
          this._states.next(this.options.id);
          return this.Events.trigger("queued", { args: this.args, options: this.options, reachedHWM, blocked });
        }
        doRun() {
          if (this.retryCount === 0) {
            this._assertStatus("QUEUED");
            this._states.next(this.options.id);
          } else {
            this._assertStatus("EXECUTING");
          }
          return this.Events.trigger("scheduled", { args: this.args, options: this.options });
        }
        async doExecute(chained, clearGlobalState, run, free) {
          var error, eventInfo, passed;
          if (this.retryCount === 0) {
            this._assertStatus("RUNNING");
            this._states.next(this.options.id);
          } else {
            this._assertStatus("EXECUTING");
          }
          eventInfo = { args: this.args, options: this.options, retryCount: this.retryCount };
          this.Events.trigger("executing", eventInfo);
          try {
            passed = await (chained != null ? chained.schedule(this.options, this.task, ...this.args) : this.task(...this.args));
            if (clearGlobalState()) {
              this.doDone(eventInfo);
              await free(this.options, eventInfo);
              this._assertStatus("DONE");
              return this._resolve(passed);
            }
          } catch (error1) {
            error = error1;
            return this._onFailure(error, eventInfo, clearGlobalState, run, free);
          }
        }
        doExpire(clearGlobalState, run, free) {
          var error, eventInfo;
          if (this._states.jobStatus(this.options.id === "RUNNING")) {
            this._states.next(this.options.id);
          }
          this._assertStatus("EXECUTING");
          eventInfo = { args: this.args, options: this.options, retryCount: this.retryCount };
          error = new BottleneckError$1(`This job timed out after ${this.options.expiration} ms.`);
          return this._onFailure(error, eventInfo, clearGlobalState, run, free);
        }
        async _onFailure(error, eventInfo, clearGlobalState, run, free) {
          var retry2, retryAfter;
          if (clearGlobalState()) {
            retry2 = await this.Events.trigger("failed", error, eventInfo);
            if (retry2 != null) {
              retryAfter = ~~retry2;
              this.Events.trigger("retry", `Retrying ${this.options.id} after ${retryAfter} ms`, eventInfo);
              this.retryCount++;
              return run(retryAfter);
            } else {
              this.doDone(eventInfo);
              await free(this.options, eventInfo);
              this._assertStatus("DONE");
              return this._reject(error);
            }
          }
        }
        doDone(eventInfo) {
          this._assertStatus("EXECUTING");
          this._states.next(this.options.id);
          return this.Events.trigger("done", eventInfo);
        }
      };
      var Job_1 = Job;
      var BottleneckError$2, LocalDatastore, parser$2;
      parser$2 = parser;
      BottleneckError$2 = BottleneckError_1;
      LocalDatastore = class LocalDatastore {
        constructor(instance, storeOptions, storeInstanceOptions) {
          this.instance = instance;
          this.storeOptions = storeOptions;
          this.clientId = this.instance._randomIndex();
          parser$2.load(storeInstanceOptions, storeInstanceOptions, this);
          this._nextRequest = this._lastReservoirRefresh = this._lastReservoirIncrease = Date.now();
          this._running = 0;
          this._done = 0;
          this._unblockTime = 0;
          this.ready = this.Promise.resolve();
          this.clients = {};
          this._startHeartbeat();
        }
        _startHeartbeat() {
          var base;
          if (this.heartbeat == null && (this.storeOptions.reservoirRefreshInterval != null && this.storeOptions.reservoirRefreshAmount != null || this.storeOptions.reservoirIncreaseInterval != null && this.storeOptions.reservoirIncreaseAmount != null)) {
            return typeof (base = this.heartbeat = setInterval(() => {
              var amount, incr, maximum, now, reservoir;
              now = Date.now();
              if (this.storeOptions.reservoirRefreshInterval != null && now >= this._lastReservoirRefresh + this.storeOptions.reservoirRefreshInterval) {
                this._lastReservoirRefresh = now;
                this.storeOptions.reservoir = this.storeOptions.reservoirRefreshAmount;
                this.instance._drainAll(this.computeCapacity());
              }
              if (this.storeOptions.reservoirIncreaseInterval != null && now >= this._lastReservoirIncrease + this.storeOptions.reservoirIncreaseInterval) {
                ({
                  reservoirIncreaseAmount: amount,
                  reservoirIncreaseMaximum: maximum,
                  reservoir
                } = this.storeOptions);
                this._lastReservoirIncrease = now;
                incr = maximum != null ? Math.min(amount, maximum - reservoir) : amount;
                if (incr > 0) {
                  this.storeOptions.reservoir += incr;
                  return this.instance._drainAll(this.computeCapacity());
                }
              }
            }, this.heartbeatInterval)).unref === "function" ? base.unref() : void 0;
          } else {
            return clearInterval(this.heartbeat);
          }
        }
        async __publish__(message) {
          await this.yieldLoop();
          return this.instance.Events.trigger("message", message.toString());
        }
        async __disconnect__(flush) {
          await this.yieldLoop();
          clearInterval(this.heartbeat);
          return this.Promise.resolve();
        }
        yieldLoop(t = 0) {
          return new this.Promise(function(resolve, reject) {
            return setTimeout(resolve, t);
          });
        }
        computePenalty() {
          var ref;
          return (ref = this.storeOptions.penalty) != null ? ref : 15 * this.storeOptions.minTime || 5e3;
        }
        async __updateSettings__(options) {
          await this.yieldLoop();
          parser$2.overwrite(options, options, this.storeOptions);
          this._startHeartbeat();
          this.instance._drainAll(this.computeCapacity());
          return true;
        }
        async __running__() {
          await this.yieldLoop();
          return this._running;
        }
        async __queued__() {
          await this.yieldLoop();
          return this.instance.queued();
        }
        async __done__() {
          await this.yieldLoop();
          return this._done;
        }
        async __groupCheck__(time) {
          await this.yieldLoop();
          return this._nextRequest + this.timeout < time;
        }
        computeCapacity() {
          var maxConcurrent, reservoir;
          ({ maxConcurrent, reservoir } = this.storeOptions);
          if (maxConcurrent != null && reservoir != null) {
            return Math.min(maxConcurrent - this._running, reservoir);
          } else if (maxConcurrent != null) {
            return maxConcurrent - this._running;
          } else if (reservoir != null) {
            return reservoir;
          } else {
            return null;
          }
        }
        conditionsCheck(weight) {
          var capacity;
          capacity = this.computeCapacity();
          return capacity == null || weight <= capacity;
        }
        async __incrementReservoir__(incr) {
          var reservoir;
          await this.yieldLoop();
          reservoir = this.storeOptions.reservoir += incr;
          this.instance._drainAll(this.computeCapacity());
          return reservoir;
        }
        async __currentReservoir__() {
          await this.yieldLoop();
          return this.storeOptions.reservoir;
        }
        isBlocked(now) {
          return this._unblockTime >= now;
        }
        check(weight, now) {
          return this.conditionsCheck(weight) && this._nextRequest - now <= 0;
        }
        async __check__(weight) {
          var now;
          await this.yieldLoop();
          now = Date.now();
          return this.check(weight, now);
        }
        async __register__(index, weight, expiration) {
          var now, wait;
          await this.yieldLoop();
          now = Date.now();
          if (this.conditionsCheck(weight)) {
            this._running += weight;
            if (this.storeOptions.reservoir != null) {
              this.storeOptions.reservoir -= weight;
            }
            wait = Math.max(this._nextRequest - now, 0);
            this._nextRequest = now + wait + this.storeOptions.minTime;
            return {
              success: true,
              wait,
              reservoir: this.storeOptions.reservoir
            };
          } else {
            return {
              success: false
            };
          }
        }
        strategyIsBlock() {
          return this.storeOptions.strategy === 3;
        }
        async __submit__(queueLength, weight) {
          var blocked, now, reachedHWM;
          await this.yieldLoop();
          if (this.storeOptions.maxConcurrent != null && weight > this.storeOptions.maxConcurrent) {
            throw new BottleneckError$2(`Impossible to add a job having a weight of ${weight} to a limiter having a maxConcurrent setting of ${this.storeOptions.maxConcurrent}`);
          }
          now = Date.now();
          reachedHWM = this.storeOptions.highWater != null && queueLength === this.storeOptions.highWater && !this.check(weight, now);
          blocked = this.strategyIsBlock() && (reachedHWM || this.isBlocked(now));
          if (blocked) {
            this._unblockTime = now + this.computePenalty();
            this._nextRequest = this._unblockTime + this.storeOptions.minTime;
            this.instance._dropAllQueued();
          }
          return {
            reachedHWM,
            blocked,
            strategy: this.storeOptions.strategy
          };
        }
        async __free__(index, weight) {
          await this.yieldLoop();
          this._running -= weight;
          this._done += weight;
          this.instance._drainAll(this.computeCapacity());
          return {
            running: this._running
          };
        }
      };
      var LocalDatastore_1 = LocalDatastore;
      var BottleneckError$3, States;
      BottleneckError$3 = BottleneckError_1;
      States = class States {
        constructor(status1) {
          this.status = status1;
          this._jobs = {};
          this.counts = this.status.map(function() {
            return 0;
          });
        }
        next(id) {
          var current, next;
          current = this._jobs[id];
          next = current + 1;
          if (current != null && next < this.status.length) {
            this.counts[current]--;
            this.counts[next]++;
            return this._jobs[id]++;
          } else if (current != null) {
            this.counts[current]--;
            return delete this._jobs[id];
          }
        }
        start(id) {
          var initial;
          initial = 0;
          this._jobs[id] = initial;
          return this.counts[initial]++;
        }
        remove(id) {
          var current;
          current = this._jobs[id];
          if (current != null) {
            this.counts[current]--;
            delete this._jobs[id];
          }
          return current != null;
        }
        jobStatus(id) {
          var ref;
          return (ref = this.status[this._jobs[id]]) != null ? ref : null;
        }
        statusJobs(status) {
          var k, pos, ref, results, v;
          if (status != null) {
            pos = this.status.indexOf(status);
            if (pos < 0) {
              throw new BottleneckError$3(`status must be one of ${this.status.join(", ")}`);
            }
            ref = this._jobs;
            results = [];
            for (k in ref) {
              v = ref[k];
              if (v === pos) {
                results.push(k);
              }
            }
            return results;
          } else {
            return Object.keys(this._jobs);
          }
        }
        statusCounts() {
          return this.counts.reduce(((acc, v, i) => {
            acc[this.status[i]] = v;
            return acc;
          }), {});
        }
      };
      var States_1 = States;
      var DLList$2, Sync;
      DLList$2 = DLList_1;
      Sync = class Sync {
        constructor(name, Promise2) {
          this.schedule = this.schedule.bind(this);
          this.name = name;
          this.Promise = Promise2;
          this._running = 0;
          this._queue = new DLList$2();
        }
        isEmpty() {
          return this._queue.length === 0;
        }
        async _tryToRun() {
          var args, cb, error, reject, resolve, returned, task;
          if (this._running < 1 && this._queue.length > 0) {
            this._running++;
            ({ task, args, resolve, reject } = this._queue.shift());
            cb = await (async function() {
              try {
                returned = await task(...args);
                return function() {
                  return resolve(returned);
                };
              } catch (error1) {
                error = error1;
                return function() {
                  return reject(error);
                };
              }
            })();
            this._running--;
            this._tryToRun();
            return cb();
          }
        }
        schedule(task, ...args) {
          var promise, reject, resolve;
          resolve = reject = null;
          promise = new this.Promise(function(_resolve, _reject) {
            resolve = _resolve;
            return reject = _reject;
          });
          this._queue.push({ task, args, resolve, reject });
          this._tryToRun();
          return promise;
        }
      };
      var Sync_1 = Sync;
      var version = "2.19.5";
      var version$1 = {
        version
      };
      var version$2 = /* @__PURE__ */ Object.freeze({
        version,
        default: version$1
      });
      var require$$2 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
      var require$$3 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
      var require$$4 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
      var Events$2, Group, IORedisConnection$1, RedisConnection$1, Scripts$1, parser$3;
      parser$3 = parser;
      Events$2 = Events_1;
      RedisConnection$1 = require$$2;
      IORedisConnection$1 = require$$3;
      Scripts$1 = require$$4;
      Group = (function() {
        class Group2 {
          constructor(limiterOptions = {}) {
            this.deleteKey = this.deleteKey.bind(this);
            this.limiterOptions = limiterOptions;
            parser$3.load(this.limiterOptions, this.defaults, this);
            this.Events = new Events$2(this);
            this.instances = {};
            this.Bottleneck = Bottleneck_1;
            this._startAutoCleanup();
            this.sharedConnection = this.connection != null;
            if (this.connection == null) {
              if (this.limiterOptions.datastore === "redis") {
                this.connection = new RedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
              } else if (this.limiterOptions.datastore === "ioredis") {
                this.connection = new IORedisConnection$1(Object.assign({}, this.limiterOptions, { Events: this.Events }));
              }
            }
          }
          key(key = "") {
            var ref;
            return (ref = this.instances[key]) != null ? ref : (() => {
              var limiter;
              limiter = this.instances[key] = new this.Bottleneck(Object.assign(this.limiterOptions, {
                id: `${this.id}-${key}`,
                timeout: this.timeout,
                connection: this.connection
              }));
              this.Events.trigger("created", limiter, key);
              return limiter;
            })();
          }
          async deleteKey(key = "") {
            var deleted, instance;
            instance = this.instances[key];
            if (this.connection) {
              deleted = await this.connection.__runCommand__(["del", ...Scripts$1.allKeys(`${this.id}-${key}`)]);
            }
            if (instance != null) {
              delete this.instances[key];
              await instance.disconnect();
            }
            return instance != null || deleted > 0;
          }
          limiters() {
            var k, ref, results, v;
            ref = this.instances;
            results = [];
            for (k in ref) {
              v = ref[k];
              results.push({
                key: k,
                limiter: v
              });
            }
            return results;
          }
          keys() {
            return Object.keys(this.instances);
          }
          async clusterKeys() {
            var cursor, end, found, i, k, keys, len, next, start;
            if (this.connection == null) {
              return this.Promise.resolve(this.keys());
            }
            keys = [];
            cursor = null;
            start = `b_${this.id}-`.length;
            end = "_settings".length;
            while (cursor !== 0) {
              [next, found] = await this.connection.__runCommand__(["scan", cursor != null ? cursor : 0, "match", `b_${this.id}-*_settings`, "count", 1e4]);
              cursor = ~~next;
              for (i = 0, len = found.length; i < len; i++) {
                k = found[i];
                keys.push(k.slice(start, -end));
              }
            }
            return keys;
          }
          _startAutoCleanup() {
            var base;
            clearInterval(this.interval);
            return typeof (base = this.interval = setInterval(async () => {
              var e, k, ref, results, time, v;
              time = Date.now();
              ref = this.instances;
              results = [];
              for (k in ref) {
                v = ref[k];
                try {
                  if (await v._store.__groupCheck__(time)) {
                    results.push(this.deleteKey(k));
                  } else {
                    results.push(void 0);
                  }
                } catch (error) {
                  e = error;
                  results.push(v.Events.trigger("error", e));
                }
              }
              return results;
            }, this.timeout / 2)).unref === "function" ? base.unref() : void 0;
          }
          updateSettings(options = {}) {
            parser$3.overwrite(options, this.defaults, this);
            parser$3.overwrite(options, options, this.limiterOptions);
            if (options.timeout != null) {
              return this._startAutoCleanup();
            }
          }
          disconnect(flush = true) {
            var ref;
            if (!this.sharedConnection) {
              return (ref = this.connection) != null ? ref.disconnect(flush) : void 0;
            }
          }
        }
        Group2.prototype.defaults = {
          timeout: 1e3 * 60 * 5,
          connection: null,
          Promise,
          id: "group-key"
        };
        return Group2;
      }).call(commonjsGlobal);
      var Group_1 = Group;
      var Batcher, Events$3, parser$4;
      parser$4 = parser;
      Events$3 = Events_1;
      Batcher = (function() {
        class Batcher2 {
          constructor(options = {}) {
            this.options = options;
            parser$4.load(this.options, this.defaults, this);
            this.Events = new Events$3(this);
            this._arr = [];
            this._resetPromise();
            this._lastFlush = Date.now();
          }
          _resetPromise() {
            return this._promise = new this.Promise((res, rej) => {
              return this._resolve = res;
            });
          }
          _flush() {
            clearTimeout(this._timeout);
            this._lastFlush = Date.now();
            this._resolve();
            this.Events.trigger("batch", this._arr);
            this._arr = [];
            return this._resetPromise();
          }
          add(data) {
            var ret;
            this._arr.push(data);
            ret = this._promise;
            if (this._arr.length === this.maxSize) {
              this._flush();
            } else if (this.maxTime != null && this._arr.length === 1) {
              this._timeout = setTimeout(() => {
                return this._flush();
              }, this.maxTime);
            }
            return ret;
          }
        }
        Batcher2.prototype.defaults = {
          maxTime: null,
          maxSize: null,
          Promise
        };
        return Batcher2;
      }).call(commonjsGlobal);
      var Batcher_1 = Batcher;
      var require$$4$1 = () => console.log("You must import the full version of Bottleneck in order to use this feature.");
      var require$$8 = getCjsExportFromNamespace(version$2);
      var Bottleneck2, DEFAULT_PRIORITY$1, Events$4, Job$1, LocalDatastore$1, NUM_PRIORITIES$1, Queues$1, RedisDatastore$1, States$1, Sync$1, parser$5, splice = [].splice;
      NUM_PRIORITIES$1 = 10;
      DEFAULT_PRIORITY$1 = 5;
      parser$5 = parser;
      Queues$1 = Queues_1;
      Job$1 = Job_1;
      LocalDatastore$1 = LocalDatastore_1;
      RedisDatastore$1 = require$$4$1;
      Events$4 = Events_1;
      States$1 = States_1;
      Sync$1 = Sync_1;
      Bottleneck2 = (function() {
        class Bottleneck3 {
          constructor(options = {}, ...invalid) {
            var storeInstanceOptions, storeOptions;
            this._addToQueue = this._addToQueue.bind(this);
            this._validateOptions(options, invalid);
            parser$5.load(options, this.instanceDefaults, this);
            this._queues = new Queues$1(NUM_PRIORITIES$1);
            this._scheduled = {};
            this._states = new States$1(["RECEIVED", "QUEUED", "RUNNING", "EXECUTING"].concat(this.trackDoneStatus ? ["DONE"] : []));
            this._limiter = null;
            this.Events = new Events$4(this);
            this._submitLock = new Sync$1("submit", this.Promise);
            this._registerLock = new Sync$1("register", this.Promise);
            storeOptions = parser$5.load(options, this.storeDefaults, {});
            this._store = (function() {
              if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
                storeInstanceOptions = parser$5.load(options, this.redisStoreDefaults, {});
                return new RedisDatastore$1(this, storeOptions, storeInstanceOptions);
              } else if (this.datastore === "local") {
                storeInstanceOptions = parser$5.load(options, this.localStoreDefaults, {});
                return new LocalDatastore$1(this, storeOptions, storeInstanceOptions);
              } else {
                throw new Bottleneck3.prototype.BottleneckError(`Invalid datastore type: ${this.datastore}`);
              }
            }).call(this);
            this._queues.on("leftzero", () => {
              var ref;
              return (ref = this._store.heartbeat) != null ? typeof ref.ref === "function" ? ref.ref() : void 0 : void 0;
            });
            this._queues.on("zero", () => {
              var ref;
              return (ref = this._store.heartbeat) != null ? typeof ref.unref === "function" ? ref.unref() : void 0 : void 0;
            });
          }
          _validateOptions(options, invalid) {
            if (!(options != null && typeof options === "object" && invalid.length === 0)) {
              throw new Bottleneck3.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
            }
          }
          ready() {
            return this._store.ready;
          }
          clients() {
            return this._store.clients;
          }
          channel() {
            return `b_${this.id}`;
          }
          channel_client() {
            return `b_${this.id}_${this._store.clientId}`;
          }
          publish(message) {
            return this._store.__publish__(message);
          }
          disconnect(flush = true) {
            return this._store.__disconnect__(flush);
          }
          chain(_limiter) {
            this._limiter = _limiter;
            return this;
          }
          queued(priority) {
            return this._queues.queued(priority);
          }
          clusterQueued() {
            return this._store.__queued__();
          }
          empty() {
            return this.queued() === 0 && this._submitLock.isEmpty();
          }
          running() {
            return this._store.__running__();
          }
          done() {
            return this._store.__done__();
          }
          jobStatus(id) {
            return this._states.jobStatus(id);
          }
          jobs(status) {
            return this._states.statusJobs(status);
          }
          counts() {
            return this._states.statusCounts();
          }
          _randomIndex() {
            return Math.random().toString(36).slice(2);
          }
          check(weight = 1) {
            return this._store.__check__(weight);
          }
          _clearGlobalState(index) {
            if (this._scheduled[index] != null) {
              clearTimeout(this._scheduled[index].expiration);
              delete this._scheduled[index];
              return true;
            } else {
              return false;
            }
          }
          async _free(index, job, options, eventInfo) {
            var e, running;
            try {
              ({ running } = await this._store.__free__(index, options.weight));
              this.Events.trigger("debug", `Freed ${options.id}`, eventInfo);
              if (running === 0 && this.empty()) {
                return this.Events.trigger("idle");
              }
            } catch (error1) {
              e = error1;
              return this.Events.trigger("error", e);
            }
          }
          _run(index, job, wait) {
            var clearGlobalState, free, run;
            job.doRun();
            clearGlobalState = this._clearGlobalState.bind(this, index);
            run = this._run.bind(this, index, job);
            free = this._free.bind(this, index, job);
            return this._scheduled[index] = {
              timeout: setTimeout(() => {
                return job.doExecute(this._limiter, clearGlobalState, run, free);
              }, wait),
              expiration: job.options.expiration != null ? setTimeout(function() {
                return job.doExpire(clearGlobalState, run, free);
              }, wait + job.options.expiration) : void 0,
              job
            };
          }
          _drainOne(capacity) {
            return this._registerLock.schedule(() => {
              var args, index, next, options, queue;
              if (this.queued() === 0) {
                return this.Promise.resolve(null);
              }
              queue = this._queues.getFirst();
              ({ options, args } = next = queue.first());
              if (capacity != null && options.weight > capacity) {
                return this.Promise.resolve(null);
              }
              this.Events.trigger("debug", `Draining ${options.id}`, { args, options });
              index = this._randomIndex();
              return this._store.__register__(index, options.weight, options.expiration).then(({ success, wait, reservoir }) => {
                var empty;
                this.Events.trigger("debug", `Drained ${options.id}`, { success, args, options });
                if (success) {
                  queue.shift();
                  empty = this.empty();
                  if (empty) {
                    this.Events.trigger("empty");
                  }
                  if (reservoir === 0) {
                    this.Events.trigger("depleted", empty);
                  }
                  this._run(index, next, wait);
                  return this.Promise.resolve(options.weight);
                } else {
                  return this.Promise.resolve(null);
                }
              });
            });
          }
          _drainAll(capacity, total = 0) {
            return this._drainOne(capacity).then((drained) => {
              var newCapacity;
              if (drained != null) {
                newCapacity = capacity != null ? capacity - drained : capacity;
                return this._drainAll(newCapacity, total + drained);
              } else {
                return this.Promise.resolve(total);
              }
            }).catch((e) => {
              return this.Events.trigger("error", e);
            });
          }
          _dropAllQueued(message) {
            return this._queues.shiftAll(function(job) {
              return job.doDrop({ message });
            });
          }
          stop(options = {}) {
            var done, waitForExecuting;
            options = parser$5.load(options, this.stopDefaults);
            waitForExecuting = (at) => {
              var finished;
              finished = () => {
                var counts;
                counts = this._states.counts;
                return counts[0] + counts[1] + counts[2] + counts[3] === at;
              };
              return new this.Promise((resolve, reject) => {
                if (finished()) {
                  return resolve();
                } else {
                  return this.on("done", () => {
                    if (finished()) {
                      this.removeAllListeners("done");
                      return resolve();
                    }
                  });
                }
              });
            };
            done = options.dropWaitingJobs ? (this._run = function(index, next) {
              return next.doDrop({
                message: options.dropErrorMessage
              });
            }, this._drainOne = () => {
              return this.Promise.resolve(null);
            }, this._registerLock.schedule(() => {
              return this._submitLock.schedule(() => {
                var k, ref, v;
                ref = this._scheduled;
                for (k in ref) {
                  v = ref[k];
                  if (this.jobStatus(v.job.options.id) === "RUNNING") {
                    clearTimeout(v.timeout);
                    clearTimeout(v.expiration);
                    v.job.doDrop({
                      message: options.dropErrorMessage
                    });
                  }
                }
                this._dropAllQueued(options.dropErrorMessage);
                return waitForExecuting(0);
              });
            })) : this.schedule({
              priority: NUM_PRIORITIES$1 - 1,
              weight: 0
            }, () => {
              return waitForExecuting(1);
            });
            this._receive = function(job) {
              return job._reject(new Bottleneck3.prototype.BottleneckError(options.enqueueErrorMessage));
            };
            this.stop = () => {
              return this.Promise.reject(new Bottleneck3.prototype.BottleneckError("stop() has already been called"));
            };
            return done;
          }
          async _addToQueue(job) {
            var args, blocked, error, options, reachedHWM, shifted, strategy;
            ({ args, options } = job);
            try {
              ({ reachedHWM, blocked, strategy } = await this._store.__submit__(this.queued(), options.weight));
            } catch (error1) {
              error = error1;
              this.Events.trigger("debug", `Could not queue ${options.id}`, { args, options, error });
              job.doDrop({ error });
              return false;
            }
            if (blocked) {
              job.doDrop();
              return true;
            } else if (reachedHWM) {
              shifted = strategy === Bottleneck3.prototype.strategy.LEAK ? this._queues.shiftLastFrom(options.priority) : strategy === Bottleneck3.prototype.strategy.OVERFLOW_PRIORITY ? this._queues.shiftLastFrom(options.priority + 1) : strategy === Bottleneck3.prototype.strategy.OVERFLOW ? job : void 0;
              if (shifted != null) {
                shifted.doDrop();
              }
              if (shifted == null || strategy === Bottleneck3.prototype.strategy.OVERFLOW) {
                if (shifted == null) {
                  job.doDrop();
                }
                return reachedHWM;
              }
            }
            job.doQueue(reachedHWM, blocked);
            this._queues.push(job);
            await this._drainAll();
            return reachedHWM;
          }
          _receive(job) {
            if (this._states.jobStatus(job.options.id) != null) {
              job._reject(new Bottleneck3.prototype.BottleneckError(`A job with the same id already exists (id=${job.options.id})`));
              return false;
            } else {
              job.doReceive();
              return this._submitLock.schedule(this._addToQueue, job);
            }
          }
          submit(...args) {
            var cb, fn, job, options, ref, ref1, task;
            if (typeof args[0] === "function") {
              ref = args, [fn, ...args] = ref, [cb] = splice.call(args, -1);
              options = parser$5.load({}, this.jobDefaults);
            } else {
              ref1 = args, [options, fn, ...args] = ref1, [cb] = splice.call(args, -1);
              options = parser$5.load(options, this.jobDefaults);
            }
            task = (...args2) => {
              return new this.Promise(function(resolve, reject) {
                return fn(...args2, function(...args3) {
                  return (args3[0] != null ? reject : resolve)(args3);
                });
              });
            };
            job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
            job.promise.then(function(args2) {
              return typeof cb === "function" ? cb(...args2) : void 0;
            }).catch(function(args2) {
              if (Array.isArray(args2)) {
                return typeof cb === "function" ? cb(...args2) : void 0;
              } else {
                return typeof cb === "function" ? cb(args2) : void 0;
              }
            });
            return this._receive(job);
          }
          schedule(...args) {
            var job, options, task;
            if (typeof args[0] === "function") {
              [task, ...args] = args;
              options = {};
            } else {
              [options, task, ...args] = args;
            }
            job = new Job$1(task, args, options, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
            this._receive(job);
            return job.promise;
          }
          wrap(fn) {
            var schedule, wrapped;
            schedule = this.schedule.bind(this);
            wrapped = function(...args) {
              return schedule(fn.bind(this), ...args);
            };
            wrapped.withOptions = function(options, ...args) {
              return schedule(options, fn, ...args);
            };
            return wrapped;
          }
          async updateSettings(options = {}) {
            await this._store.__updateSettings__(parser$5.overwrite(options, this.storeDefaults));
            parser$5.overwrite(options, this.instanceDefaults, this);
            return this;
          }
          currentReservoir() {
            return this._store.__currentReservoir__();
          }
          incrementReservoir(incr = 0) {
            return this._store.__incrementReservoir__(incr);
          }
        }
        Bottleneck3.default = Bottleneck3;
        Bottleneck3.Events = Events$4;
        Bottleneck3.version = Bottleneck3.prototype.version = require$$8.version;
        Bottleneck3.strategy = Bottleneck3.prototype.strategy = {
          LEAK: 1,
          OVERFLOW: 2,
          OVERFLOW_PRIORITY: 4,
          BLOCK: 3
        };
        Bottleneck3.BottleneckError = Bottleneck3.prototype.BottleneckError = BottleneckError_1;
        Bottleneck3.Group = Bottleneck3.prototype.Group = Group_1;
        Bottleneck3.RedisConnection = Bottleneck3.prototype.RedisConnection = require$$2;
        Bottleneck3.IORedisConnection = Bottleneck3.prototype.IORedisConnection = require$$3;
        Bottleneck3.Batcher = Bottleneck3.prototype.Batcher = Batcher_1;
        Bottleneck3.prototype.jobDefaults = {
          priority: DEFAULT_PRIORITY$1,
          weight: 1,
          expiration: null,
          id: "<no-id>"
        };
        Bottleneck3.prototype.storeDefaults = {
          maxConcurrent: null,
          minTime: 0,
          highWater: null,
          strategy: Bottleneck3.prototype.strategy.LEAK,
          penalty: null,
          reservoir: null,
          reservoirRefreshInterval: null,
          reservoirRefreshAmount: null,
          reservoirIncreaseInterval: null,
          reservoirIncreaseAmount: null,
          reservoirIncreaseMaximum: null
        };
        Bottleneck3.prototype.localStoreDefaults = {
          Promise,
          timeout: null,
          heartbeatInterval: 250
        };
        Bottleneck3.prototype.redisStoreDefaults = {
          Promise,
          timeout: null,
          heartbeatInterval: 5e3,
          clientTimeout: 1e4,
          Redis: null,
          clientOptions: {},
          clusterNodes: null,
          clearDatastore: false,
          connection: null
        };
        Bottleneck3.prototype.instanceDefaults = {
          datastore: "local",
          connection: null,
          id: "<no-id>",
          rejectOnDrop: true,
          trackDoneStatus: false,
          Promise
        };
        Bottleneck3.prototype.stopDefaults = {
          enqueueErrorMessage: "This limiter has been stopped and cannot accept new jobs.",
          dropWaitingJobs: true,
          dropErrorMessage: "This limiter has been stopped."
        };
        return Bottleneck3;
      }).call(commonjsGlobal);
      var Bottleneck_1 = Bottleneck2;
      var lib = Bottleneck_1;
      return lib;
    }));
  }
});

// node_modules/@octokit/plugin-retry/node_modules/@octokit/request-error/dist-src/index.js
var RequestError3;
var init_dist_src5 = __esm({
  "node_modules/@octokit/plugin-retry/node_modules/@octokit/request-error/dist-src/index.js"() {
    "use strict";
    init_esm_shims();
    RequestError3 = class extends Error {
      name;
      /**
       * http status code
       */
      status;
      /**
       * Request options that lead to the error.
       */
      request;
      /**
       * Response object if a response was received
       */
      response;
      constructor(message, statusCode, options) {
        super(message, { cause: options.cause });
        this.name = "HttpError";
        this.status = Number.parseInt(statusCode);
        if (Number.isNaN(this.status)) {
          this.status = 0;
        }
        if ("response" in options) {
          this.response = options.response;
        }
        const requestCopy = Object.assign({}, options.request);
        if (options.request.headers.authorization) {
          requestCopy.headers = Object.assign({}, options.request.headers, {
            authorization: options.request.headers.authorization.replace(
              /(?<! ) .*$/,
              " [REDACTED]"
            )
          });
        }
        requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
        this.request = requestCopy;
      }
    };
  }
});

// node_modules/@octokit/plugin-retry/dist-bundle/index.js
async function errorRequest(state, octokit, error, options) {
  if (!error.request || !error.request.request) {
    throw error;
  }
  if (error.status >= 400 && !state.doNotRetry.includes(error.status)) {
    const retries = options.request.retries != null ? options.request.retries : state.retries;
    const retryAfter = Math.pow((options.request.retryCount || 0) + 1, 2);
    throw octokit.retry.retryRequest(error, retries, retryAfter);
  }
  throw error;
}
async function wrapRequest(state, octokit, request3, options) {
  const limiter = new import_light.default();
  limiter.on("failed", function(error, info) {
    const maxRetries = ~~error.request.request.retries;
    const after = ~~error.request.request.retryAfter;
    options.request.retryCount = info.retryCount + 1;
    if (maxRetries > info.retryCount) {
      return after * state.retryAfterBaseValue;
    }
  });
  return limiter.schedule(
    requestWithGraphqlErrorHandling.bind(null, state, octokit, request3),
    options
  );
}
async function requestWithGraphqlErrorHandling(state, octokit, request3, options) {
  const response = await request3(request3, options);
  if (response.data && response.data.errors && response.data.errors.length > 0 && /Something went wrong while executing your query/.test(
    response.data.errors[0].message
  )) {
    const error = new RequestError3(response.data.errors[0].message, 500, {
      request: options,
      response
    });
    return errorRequest(state, octokit, error, options);
  }
  return response;
}
function retry(octokit, octokitOptions) {
  const state = Object.assign(
    {
      enabled: true,
      retryAfterBaseValue: 1e3,
      doNotRetry: [400, 401, 403, 404, 410, 422, 451],
      retries: 3
    },
    octokitOptions.retry
  );
  if (state.enabled) {
    octokit.hook.error("request", errorRequest.bind(null, state, octokit));
    octokit.hook.wrap("request", wrapRequest.bind(null, state, octokit));
  }
  return {
    retry: {
      retryRequest: (error, retries, retryAfter) => {
        error.request.request = Object.assign({}, error.request.request, {
          retries,
          retryAfter
        });
        return error;
      }
    }
  };
}
var import_light, VERSION9;
var init_dist_bundle9 = __esm({
  "node_modules/@octokit/plugin-retry/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    import_light = __toESM(require_light(), 1);
    init_dist_src5();
    VERSION9 = "0.0.0-development";
    retry.VERSION = VERSION9;
  }
});

// node_modules/@octokit/plugin-throttling/dist-bundle/index.js
function wrapRequest2(state, request3, options) {
  return state.retryLimiter.schedule(doRequest, state, request3, options);
}
async function doRequest(state, request3, options) {
  const { pathname } = new URL(options.url, "http://github.test");
  const isAuth = isAuthRequest(options.method, pathname);
  const isWrite = !isAuth && options.method !== "GET" && options.method !== "HEAD";
  const isSearch = options.method === "GET" && pathname.startsWith("/search/");
  const isGraphQL = pathname.startsWith("/graphql");
  const retryCount = ~~request3.retryCount;
  const jobOptions = retryCount > 0 ? { priority: 0, weight: 0 } : {};
  if (state.clustering) {
    jobOptions.expiration = 1e3 * 60;
  }
  if (isWrite || isGraphQL) {
    await state.write.key(state.id).schedule(jobOptions, noop4);
  }
  if (isWrite && state.triggersNotification(pathname)) {
    await state.notifications.key(state.id).schedule(jobOptions, noop4);
  }
  if (isSearch) {
    await state.search.key(state.id).schedule(jobOptions, noop4);
  }
  const req = (isAuth ? state.auth : state.global).key(state.id).schedule(jobOptions, request3, options);
  if (isGraphQL) {
    const res = await req;
    if (res.data.errors != null && res.data.errors.some((error) => error.type === "RATE_LIMITED")) {
      const error = Object.assign(new Error("GraphQL Rate Limit Exceeded"), {
        response: res,
        data: res.data
      });
      throw error;
    }
  }
  return req;
}
function isAuthRequest(method, pathname) {
  return method === "PATCH" && // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#create-a-scoped-access-token
  /^\/applications\/[^/]+\/token\/scoped$/.test(pathname) || method === "POST" && // https://docs.github.com/en/rest/apps/oauth-applications?apiVersion=2022-11-28#reset-a-token
  (/^\/applications\/[^/]+\/token$/.test(pathname) || // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#create-an-installation-access-token-for-an-app
  /^\/app\/installations\/[^/]+\/access_tokens$/.test(pathname) || // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  pathname === "/login/oauth/access_token");
}
function routeMatcher(paths) {
  const regexes = paths.map(
    (path3) => path3.split("/").map((c) => c.startsWith("{") ? "(?:.+?)" : c).join("/")
  );
  const regex2 = `^(?:${regexes.map((r) => `(?:${r})`).join("|")})[^/]*$`;
  return new RegExp(regex2, "i");
}
function throttling(octokit, octokitOptions) {
  const {
    enabled = true,
    Bottleneck: Bottleneck2 = import_light2.default,
    id = "no-id",
    timeout = 1e3 * 60 * 2,
    // Redis TTL: 2 minutes
    connection
  } = octokitOptions.throttle || {};
  if (!enabled) {
    return {};
  }
  const common = { timeout };
  if (typeof connection !== "undefined") {
    common.connection = connection;
  }
  if (groups.global == null) {
    createGroups(Bottleneck2, common);
  }
  const state = Object.assign(
    {
      clustering: connection != null,
      triggersNotification,
      fallbackSecondaryRateRetryAfter: 60,
      retryAfterBaseValue: 1e3,
      retryLimiter: new Bottleneck2(),
      id,
      ...groups
    },
    octokitOptions.throttle
  );
  if (typeof state.onSecondaryRateLimit !== "function" || typeof state.onRateLimit !== "function") {
    throw new Error(`octokit/plugin-throttling error:
        You must pass the onSecondaryRateLimit and onRateLimit error handlers.
        See https://octokit.github.io/rest.js/#throttling

        const octokit = new Octokit({
          throttle: {
            onSecondaryRateLimit: (retryAfter, options) => {/* ... */},
            onRateLimit: (retryAfter, options) => {/* ... */}
          }
        })
    `);
  }
  const events = {};
  const emitter = new Bottleneck2.Events(events);
  events.on("secondary-limit", state.onSecondaryRateLimit);
  events.on("rate-limit", state.onRateLimit);
  events.on(
    "error",
    (e) => octokit.log.warn("Error in throttling-plugin limit handler", e)
  );
  state.retryLimiter.on("failed", async function(error, info) {
    const [state2, request3, options] = info.args;
    const { pathname } = new URL(options.url, "http://github.test");
    const shouldRetryGraphQL = pathname.startsWith("/graphql") && error.status !== 401;
    if (!(shouldRetryGraphQL || error.status === 403 || error.status === 429)) {
      return;
    }
    const retryCount = ~~request3.retryCount;
    request3.retryCount = retryCount;
    options.request.retryCount = retryCount;
    const { wantRetry, retryAfter = 0 } = await (async function() {
      if (/\bsecondary rate\b/i.test(error.message)) {
        const retryAfter2 = Number(error.response.headers["retry-after"]) || state2.fallbackSecondaryRateRetryAfter;
        const wantRetry2 = await emitter.trigger(
          "secondary-limit",
          retryAfter2,
          options,
          octokit,
          retryCount
        );
        return { wantRetry: wantRetry2, retryAfter: retryAfter2 };
      }
      if (error.response.headers != null && error.response.headers["x-ratelimit-remaining"] === "0" || (error.response.data?.errors ?? []).some(
        (error2) => error2.type === "RATE_LIMITED"
      )) {
        const rateLimitReset = new Date(
          ~~error.response.headers["x-ratelimit-reset"] * 1e3
        ).getTime();
        const retryAfter2 = Math.max(
          // Add one second so we retry _after_ the reset time
          // https://docs.github.com/en/rest/overview/resources-in-the-rest-api?apiVersion=2022-11-28#exceeding-the-rate-limit
          Math.ceil((rateLimitReset - Date.now()) / 1e3) + 1,
          0
        );
        const wantRetry2 = await emitter.trigger(
          "rate-limit",
          retryAfter2,
          options,
          octokit,
          retryCount
        );
        return { wantRetry: wantRetry2, retryAfter: retryAfter2 };
      }
      return {};
    })();
    if (wantRetry) {
      request3.retryCount++;
      return retryAfter * state2.retryAfterBaseValue;
    }
  });
  octokit.hook.wrap("request", wrapRequest2.bind(null, state));
  return {};
}
var import_light2, VERSION10, noop4, triggers_notification_paths_default, regex, triggersNotification, groups, createGroups;
var init_dist_bundle10 = __esm({
  "node_modules/@octokit/plugin-throttling/dist-bundle/index.js"() {
    "use strict";
    init_esm_shims();
    import_light2 = __toESM(require_light(), 1);
    VERSION10 = "0.0.0-development";
    noop4 = () => Promise.resolve();
    triggers_notification_paths_default = [
      "/orgs/{org}/invitations",
      "/orgs/{org}/invitations/{invitation_id}",
      "/orgs/{org}/teams/{team_slug}/discussions",
      "/orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
      "/repos/{owner}/{repo}/collaborators/{username}",
      "/repos/{owner}/{repo}/commits/{commit_sha}/comments",
      "/repos/{owner}/{repo}/issues",
      "/repos/{owner}/{repo}/issues/{issue_number}/comments",
      "/repos/{owner}/{repo}/issues/{issue_number}/sub_issue",
      "/repos/{owner}/{repo}/issues/{issue_number}/sub_issues/priority",
      "/repos/{owner}/{repo}/pulls",
      "/repos/{owner}/{repo}/pulls/{pull_number}/comments",
      "/repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
      "/repos/{owner}/{repo}/pulls/{pull_number}/merge",
      "/repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
      "/repos/{owner}/{repo}/pulls/{pull_number}/reviews",
      "/repos/{owner}/{repo}/releases",
      "/teams/{team_id}/discussions",
      "/teams/{team_id}/discussions/{discussion_number}/comments"
    ];
    regex = routeMatcher(triggers_notification_paths_default);
    triggersNotification = regex.test.bind(regex);
    groups = {};
    createGroups = function(Bottleneck2, common) {
      groups.global = new Bottleneck2.Group({
        id: "octokit-global",
        maxConcurrent: 10,
        ...common
      });
      groups.auth = new Bottleneck2.Group({
        id: "octokit-auth",
        maxConcurrent: 1,
        ...common
      });
      groups.search = new Bottleneck2.Group({
        id: "octokit-search",
        maxConcurrent: 1,
        minTime: 2e3,
        ...common
      });
      groups.write = new Bottleneck2.Group({
        id: "octokit-write",
        maxConcurrent: 1,
        minTime: 1e3,
        ...common
      });
      groups.notifications = new Bottleneck2.Group({
        id: "octokit-notifications",
        maxConcurrent: 1,
        minTime: 3e3,
        ...common
      });
    };
    throttling.VERSION = VERSION10;
    throttling.triggersNotification = triggersNotification;
  }
});

// node_modules/@ubiquity-os/plugin-sdk/dist/octokit.mjs
var defaultOptions, customOctokit;
var init_octokit = __esm({
  "node_modules/@ubiquity-os/plugin-sdk/dist/octokit.mjs"() {
    "use strict";
    init_esm_shims();
    init_dist_src3();
    init_dist_bundle7();
    init_dist_bundle8();
    init_dist_src4();
    init_dist_bundle9();
    init_dist_bundle10();
    defaultOptions = {
      throttle: {
        onAbuseLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`Abuse limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`);
          return true;
        },
        onRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`Secondary rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`);
          return true;
        }
      }
    };
    customOctokit = Octokit.plugin(throttling, retry, paginateRest, restEndpointMethods, paginateGraphQL).defaults((instanceOptions) => {
      return { ...defaultOptions, ...instanceOptions };
    });
  }
});

// src/handlers/codex-agent/lib/config.ts
function resolvePatToken() {
  for (const key of PAT_ENV_VARS) {
    const value = process.env[key];
    if (value && value.trim()) {
      return { token: value.trim(), source: key };
    }
  }
  return { token: "", source: "" };
}
function selectPatToken() {
  return resolvePatToken().token;
}
function requirePatToken(opts) {
  const resolution = resolvePatToken();
  if (!resolution.token) {
    const hint = PAT_ENV_VARS.join(" or ");
    const purpose = opts?.purpose ? ` for ${opts.purpose}` : "";
    throw new Error(`Missing PAT${purpose}. Set ${hint}.`);
  }
  return resolution;
}
var PAT_ENV_VARS;
var init_config = __esm({
  "src/handlers/codex-agent/lib/config.ts"() {
    "use strict";
    init_esm_shims();
    PAT_ENV_VARS = ["USER_PAT_FULL", "PAT_FULL", "USER_PAT"];
  }
});

// src/handlers/codex-agent/lib/utils.ts
function toObject(v) {
  return v && typeof v === "object" ? v : {};
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : void 0;
}
function toStringOrUndefined(v) {
  if (typeof v === "string") return v;
  if (v != null) return String(v);
  return void 0;
}
async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}
function stripUrlFields(value) {
  const redundantUrlKey = /_url$/i;
  if (Array.isArray(value)) {
    return value.map(stripUrlFields);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (redundantUrlKey.test(k)) continue;
      out[k] = stripUrlFields(v);
    }
    return out;
  }
  return value;
}
var init_utils = __esm({
  "src/handlers/codex-agent/lib/utils.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/handlers/codex-agent/lib/github.ts
function getEnvString(keys, fallback) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== void 0 && value !== "") return value;
  }
  return fallback;
}
function getEnvNumber(keys, fallback) {
  const value = getEnvString(keys);
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function parseBool(value, fallback) {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
function parseOwnerRepo(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length < 2) return null;
  const owner = parts[0].trim();
  const repo = parts[1].trim();
  if (!owner || !repo) return null;
  return { owner, repo };
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function truncate(value, maxChars) {
  if (!value) return value;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars).trimEnd() + "...";
}
function looksSensitive(value) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}
function parseDateMs(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
function isPastLookback(updatedAtMs, minUpdatedAtMs) {
  if (minUpdatedAtMs === null || updatedAtMs === null) return false;
  return updatedAtMs < minUpdatedAtMs;
}
function shouldSkipStyleBody(body, markers) {
  if (markers.some((marker) => marker && body.includes(marker))) return true;
  return looksSensitive(body);
}
function normalizeStyleBody(body, maxChars) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length < 40) return null;
  const trimmed = truncate(normalized, maxChars);
  return trimmed || null;
}
function normalizeStyleExamples(raw, maxChars) {
  if (!Array.isArray(raw)) return [];
  const max = Math.max(120, Math.min(800, Math.floor(maxChars)));
  const examples = [];
  for (const item of raw) {
    const obj = toObject(item);
    const bodyRaw = toStringOrUndefined(obj.body);
    if (!bodyRaw) continue;
    const normalized = bodyRaw.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const body = truncate(normalized, max);
    if (!body) continue;
    examples.push({
      body,
      createdAt: toStringOrUndefined(obj.createdAt) ?? "",
      url: toStringOrUndefined(obj.url),
      repo: toStringOrUndefined(obj.repo)
    });
  }
  return examples;
}
function buildHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28"
  };
}
function normalizeStyleSource(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "vector-db" || normalized === "vector" || normalized === "vectordb") return "vector-db";
  if (normalized === "github" || normalized === "gh") return "github";
  return null;
}
function normalizeRepoKey(value) {
  return (value ?? "").trim().toLowerCase();
}
function isSameRepo(params) {
  const { owner, repo, candidateFull, candidateOwner, candidateName } = params;
  const target = normalizeRepoKey(`${owner}/${repo}`);
  return candidateFull && normalizeRepoKey(candidateFull) === target || candidateOwner && candidateName && normalizeRepoKey(`${candidateOwner}/${candidateName}`) === target;
}
function getStyleSourceOrder() {
  const raw = (getEnvString(["PROMPT_STYLE_SOURCE", "UOS_STYLE_SOURCE"], "github") ?? "github").trim().toLowerCase();
  if (raw === "auto") return { order: ["vector-db", "github"], raw };
  const normalized = normalizeStyleSource(raw);
  if (normalized) return { order: [normalized], raw: normalized };
  return { order: ["github"], raw: "github" };
}
function getVectorDbConfig() {
  const rawUrl = getEnvString(["UOS_VECTOR_DB_URL", "SUPABASE_URL"]);
  const rawKey = getEnvString(["UOS_VECTOR_DB_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "SUPABASE_ANON_KEY"]);
  const projectId = getEnvString(["SUPABASE_PROJECT_ID"]);
  const trimmedUrl = rawUrl?.trim() ?? "";
  const trimmedProject = projectId?.trim() ?? "";
  let url = "";
  if (trimmedUrl) {
    url = trimmedUrl.replace(/\/+$/, "");
  } else if (trimmedProject) {
    url = `https://${trimmedProject}.supabase.co`;
  }
  const key = rawKey?.trim() ?? "";
  if (!url || !key) return null;
  return { url, key };
}
function buildVectorDbHeaders(config) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json"
  };
}
function buildVectorDbUrl(params) {
  const { config, authorId, docTypes, from, maxDate, limit, offset } = params;
  const select = "id,doc_type,markdown,author_id,created_at,modified_at,payload";
  const query = [];
  query.push(`select=${encodeURIComponent(select)}`);
  query.push(`author_id=eq.${encodeURIComponent(String(authorId))}`);
  if (docTypes.length > 0) {
    const inList = docTypes.map((docType) => encodeURIComponent(docType)).join(",");
    query.push(`doc_type=in.(${inList})`);
  }
  query.push("deleted_at=is.null");
  query.push("markdown=not.is.null");
  if (Number.isFinite(from.getTime())) {
    query.push(`modified_at=gte.${encodeURIComponent(from.toISOString())}`);
  }
  if (Number.isFinite(maxDate.getTime())) {
    query.push(`modified_at=lte.${encodeURIComponent(maxDate.toISOString())}`);
  }
  query.push("order=modified_at.desc");
  query.push(`limit=${Math.max(1, Math.min(200, Math.floor(limit)))}`);
  query.push(`offset=${Math.max(0, Math.floor(offset))}`);
  return `${config.url}/rest/v1/documents?${query.join("&")}`;
}
async function fetchGithubUserId(params) {
  const { login, token, logger } = params;
  const trimmed = login.trim();
  if (!trimmed || !token) return null;
  const url = `https://api.github.com/users/${encodeURIComponent(trimmed)}`;
  const resp = await fetch(url, { headers: buildHeaders(token) });
  if (!resp.ok) {
    const txt = await safeText(resp);
    logger.info("[codexAgent] Style author lookup failed (non-fatal)", { status: resp.status, body: txt.slice(0, 200) });
    return null;
  }
  const json = await resp.json();
  const id = Number(json?.id);
  if (!Number.isFinite(id)) return null;
  return id;
}
function extractRepoFromPayload(payload) {
  const info = extractRepoInfoFromPayload(payload);
  if (info.fullName) return info.fullName;
  if (info.owner && info.name) return `${info.owner}/${info.name}`;
  return info.name;
}
function extractUrlFromPayload(payload) {
  const comment = toObject(toObject(payload).comment);
  const issue = toObject(toObject(payload).issue);
  return toStringOrUndefined(comment.html_url) ?? toStringOrUndefined(issue.html_url) ?? toStringOrUndefined(toObject(payload).url);
}
function extractRepoInfoFromPayload(payload) {
  const repo = toObject(toObject(payload).repository);
  const fullName = toStringOrUndefined(repo.full_name) ?? toStringOrUndefined(repo.nameWithOwner);
  const name = toStringOrUndefined(repo.name);
  const owner = toStringOrUndefined(toObject(repo.owner).login) ?? toStringOrUndefined(toObject(repo.owner).name);
  return { fullName, name, owner };
}
function getStyleCacheConfig() {
  const issueNumber = Math.floor(getEnvNumber(["PROMPT_STYLE_CACHE_ISSUE", "UOS_STYLE_CACHE_ISSUE"], 0));
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) return null;
  const repoRaw = getEnvString(["PROMPT_STYLE_CACHE_REPO", "UOS_STYLE_CACHE_REPO"]) || process.env.GITHUB_REPOSITORY;
  if (!repoRaw) return null;
  const repo = parseOwnerRepo(repoRaw);
  if (!repo) return null;
  const markerLabel = getEnvString(["PROMPT_STYLE_CACHE_MARKER", "UOS_STYLE_CACHE_MARKER"], DEFAULT_STYLE_CACHE_MARKER) ?? DEFAULT_STYLE_CACHE_MARKER;
  const markerRegex = new RegExp(`<!--\\s*${escapeRegExp(markerLabel)}\\s*([\\s\\S]*?)\\s*-->`, "i");
  const ttlHours = Math.max(1, Math.min(168, Math.floor(getEnvNumber(["PROMPT_STYLE_CACHE_TTL_HOURS", "UOS_STYLE_CACHE_TTL_HOURS"], 24))));
  const shouldWriteCache = parseBool(getEnvString(["PROMPT_STYLE_CACHE_WRITE", "UOS_STYLE_CACHE_WRITE"], "1"), true);
  return {
    owner: repo.owner,
    repo: repo.repo,
    issueNumber,
    markerLabel,
    markerRegex,
    ttlMs: ttlHours * 60 * 60 * 1e3,
    shouldWriteCache
  };
}
function isStyleNodeInRepo(node, repoFilter) {
  const repoName = node?.repository?.nameWithOwner;
  return !repoFilter || isSameRepo({ owner: repoFilter.owner, repo: repoFilter.repo, candidateFull: repoName });
}
function getStyleNodeBody(node, markers, maxChars) {
  const body = (node?.body ?? "").trim();
  if (!body) return null;
  if (shouldSkipStyleBody(body, markers)) return null;
  return normalizeStyleBody(body, maxChars);
}
function getVectorRowBody(row, markers, maxChars) {
  const body = typeof row.markdown === "string" ? row.markdown.trim() : "";
  if (!body) return null;
  if (shouldSkipStyleBody(body, markers)) return null;
  return normalizeStyleBody(body, maxChars);
}
function isVectorRowInRepo(row, repoFilter) {
  const info = extractRepoInfoFromPayload(row.payload);
  return !repoFilter || isSameRepo({ owner: repoFilter.owner, repo: repoFilter.repo, candidateFull: info.fullName, candidateOwner: info.owner, candidateName: info.name });
}
function isUpdatedWithinBounds(updatedAtMs, minUpdatedAtMs, maxUpdatedAtMs) {
  return !(minUpdatedAtMs !== null && updatedAtMs !== null && updatedAtMs < minUpdatedAtMs || maxUpdatedAtMs !== null && updatedAtMs !== null && updatedAtMs > maxUpdatedAtMs);
}
function appendStyleExamples(nodes, examples, limit, markers, maxChars, minUpdatedAtMs, repoFilter) {
  let hasReachedLookback = false;
  for (const node of nodes) {
    const updatedAtMs = parseDateMs(node?.updatedAt) ?? parseDateMs(node?.createdAt);
    if (isPastLookback(updatedAtMs, minUpdatedAtMs)) {
      hasReachedLookback = true;
      continue;
    }
    if (!isStyleNodeInRepo(node, repoFilter)) continue;
    const trimmed = getStyleNodeBody(node, markers, maxChars);
    if (!trimmed) continue;
    examples.push({
      body: trimmed,
      createdAt: String(node?.createdAt ?? ""),
      url: node?.url,
      repo: node?.repository?.nameWithOwner
    });
    if (examples.length >= limit) break;
  }
  return { hasReachedLookback };
}
async function fetchStylePage(params) {
  const { headers, variables, logger } = params;
  const resp = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: STYLE_QUERY, variables })
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    logger.info("[codexAgent] Style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
    return null;
  }
  const json = await resp.json();
  const issueComments = json.data?.user?.issueComments;
  return {
    nodes: issueComments?.nodes ?? [],
    pageInfo: issueComments?.pageInfo ?? {}
  };
}
async function collectStyleExamples(params) {
  const { login, from, headers, limit, marker, maxChars, repoFilter, logger } = params;
  const examples = [];
  let cursor = null;
  let hasNext = true;
  const markers = [marker, DEFAULT_REPLY_MARKER].filter(Boolean);
  const minUpdatedAtMs = Number.isFinite(from.getTime()) ? from.getTime() : null;
  while (hasNext && examples.length < limit) {
    const page = await fetchStylePage({
      headers,
      variables: {
        login,
        cursor
      },
      logger
    });
    if (!page) return examples;
    const { hasReachedLookback } = appendStyleExamples(page.nodes, examples, limit, markers, maxChars, minUpdatedAtMs, repoFilter);
    hasNext = Boolean(page.pageInfo.hasNextPage);
    cursor = page.pageInfo.endCursor ?? null;
    if (hasReachedLookback) break;
  }
  return examples.slice(0, limit);
}
function parseVectorDbRow(value) {
  if (!value || typeof value !== "object") return null;
  const obj = toObject(value);
  const markdown = typeof obj.markdown === "string" ? obj.markdown : null;
  return {
    id: toStringOrUndefined(obj.id),
    markdown,
    created_at: toStringOrUndefined(obj.created_at),
    modified_at: toStringOrUndefined(obj.modified_at),
    payload: obj.payload ?? null
  };
}
function appendVectorStyleExamples(params) {
  const { rows, examples, limit, markers, maxChars, minUpdatedAtMs, maxUpdatedAtMs, repoFilter } = params;
  for (const row of rows) {
    if (examples.length >= limit) break;
    const trimmed = getVectorRowBody(row, markers, maxChars);
    if (!trimmed) continue;
    if (!isVectorRowInRepo(row, repoFilter)) continue;
    const updatedAt = row.modified_at ?? row.created_at;
    const updatedAtMs = parseDateMs(updatedAt);
    if (!isUpdatedWithinBounds(updatedAtMs, minUpdatedAtMs, maxUpdatedAtMs)) continue;
    examples.push({
      body: trimmed,
      createdAt: updatedAt,
      url: extractUrlFromPayload(row.payload),
      repo: extractRepoFromPayload(row.payload)
    });
  }
}
async function collectStyleExamplesFromVectorDb(params) {
  const { login, token, config, from, maxDate, limit, marker, maxChars, repoFilter, logger } = params;
  const authorId = await fetchGithubUserId({ login, token, logger });
  if (!authorId) return [];
  const docTypes = ["issue_comment", "review_comment", "pull_request_review"];
  const pageSize = Math.max(25, Math.min(200, Math.floor(limit * 4)));
  const examples = [];
  const markers = [marker, DEFAULT_REPLY_MARKER].filter(Boolean);
  const minUpdatedAtMs = Number.isFinite(from.getTime()) ? from.getTime() : null;
  const maxUpdatedAtMs = Number.isFinite(maxDate.getTime()) ? maxDate.getTime() : null;
  let offset = 0;
  while (examples.length < limit) {
    const url = buildVectorDbUrl({
      config,
      authorId,
      docTypes,
      from,
      maxDate,
      limit: pageSize,
      offset
    });
    const resp = await fetch(url, { headers: buildVectorDbHeaders(config) });
    if (!resp.ok) {
      const txt = await safeText(resp);
      logger.info("[codexAgent] Vector DB style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 200) });
      break;
    }
    const json = await resp.json();
    if (!Array.isArray(json) || json.length === 0) break;
    const rows = json.map(parseVectorDbRow).filter((row) => Boolean(row));
    appendVectorStyleExamples({
      rows,
      examples,
      limit,
      markers,
      maxChars,
      minUpdatedAtMs,
      maxUpdatedAtMs,
      repoFilter
    });
    offset += json.length;
    if (json.length < pageSize) break;
  }
  return examples.slice(0, limit);
}
async function fetchIssueComments(params) {
  const { owner, repo, issueNumber, token, logger } = params;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`;
  const resp = await fetch(url, {
    method: "GET",
    headers: buildHeaders(token)
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    logger.info("[codexAgent] Style cache read failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
    return [];
  }
  const json = await resp.json();
  if (!Array.isArray(json)) return [];
  return json.map((comment) => {
    const obj = toObject(comment);
    return {
      id: toNumber(obj.id),
      body: toStringOrUndefined(obj.body),
      created_at: toStringOrUndefined(obj.created_at),
      updated_at: toStringOrUndefined(obj.updated_at)
    };
  });
}
function findStyleCacheComment(comments, markerRegex) {
  for (const comment of comments) {
    const body = typeof comment.body === "string" ? comment.body : "";
    if (body && markerRegex.test(body)) return comment;
  }
  return null;
}
function parseStyleCacheComment(body, markerRegex, maxChars) {
  const match = markerRegex.exec(body);
  const raw = (match ? match[1] : body).trim();
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const obj = toObject(parsed);
  const examples = normalizeStyleExamples(obj.examples, maxChars);
  if (!examples.length) return null;
  const source = normalizeStyleSource(toStringOrUndefined(obj.source));
  return {
    version: toNumber(obj.version),
    updatedAt: toStringOrUndefined(obj.updatedAt),
    login: toStringOrUndefined(obj.login),
    repo: toStringOrUndefined(obj.repo),
    lookbackDays: toNumber(obj.lookbackDays),
    limit: toNumber(obj.limit),
    maxChars: toNumber(obj.maxChars),
    source: source ?? void 0,
    examples
  };
}
function isStyleCacheUsable(cache, params) {
  const { login, repo, limit, lookbackDays, ttlMs, source } = params;
  if (!cache.updatedAt) return false;
  const updatedAt = new Date(cache.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return false;
  if (Date.now() - updatedAt.getTime() > ttlMs) return false;
  if (!cache.login || cache.login.toLowerCase() !== login.toLowerCase()) return false;
  if (!cache.repo || normalizeRepoKey(cache.repo) !== normalizeRepoKey(repo)) return false;
  if (!cache.lookbackDays || cache.lookbackDays !== lookbackDays) return false;
  if (!cache.limit || cache.limit < limit) return false;
  const cacheSource = cache.source ?? "github";
  if (cacheSource !== source) return false;
  return cache.examples.length > 0;
}
function buildStyleCacheBody(markerLabel, payload) {
  return `<!-- ${markerLabel} ${safeStringify(payload)} -->`;
}
async function upsertStyleCacheComment(params) {
  const { owner, repo, issueNumber, commentId, body, token, logger } = params;
  const headers = buildHeaders(token);
  if (commentId) {
    const url2 = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`;
    const resp2 = await fetch(url2, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ body })
    });
    if (!resp2.ok) {
      const txt = await safeText(resp2);
      logger.info("[codexAgent] Style cache update failed (non-fatal)", { status: resp2.status, body: txt.slice(0, 500) });
    }
    return;
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ body })
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    logger.info("[codexAgent] Style cache write failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
  }
}
function getStyleFetchSettings(params) {
  const { owner, repo } = params;
  const limit = Math.max(0, Math.min(50, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLES", "UOS_STYLE_EXAMPLES"], 12))));
  const maxChars = Math.max(120, Math.min(800, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLE_MAX_CHARS", "UOS_STYLE_EXAMPLE_MAX_CHARS"], 320))));
  const lookbackDays = Math.max(30, Math.min(3650, Math.floor(getEnvNumber(["PROMPT_STYLE_LOOKBACK_DAYS", "UOS_STYLE_LOOKBACK_DAYS"], 365))));
  const maxDateRaw = getEnvString(["PROMPT_STYLE_MAX_DATE", "UOS_STYLE_MAX_DATE"]);
  let maxDate = maxDateRaw ? new Date(maxDateRaw) : /* @__PURE__ */ new Date();
  if (Number.isNaN(maxDate.getTime())) maxDate = /* @__PURE__ */ new Date();
  const from = new Date(maxDate.getTime() - lookbackDays * 24 * 60 * 60 * 1e3);
  const marker = getEnvString(["PROMPT_STYLE_CACHE_MARKER", "UOS_STYLE_CACHE_MARKER"], DEFAULT_STYLE_CACHE_MARKER) ?? DEFAULT_STYLE_CACHE_MARKER;
  const repoFilter = owner && repo ? { owner, repo } : void 0;
  const repoFullName = owner && repo ? `${owner}/${repo}` : "";
  return {
    limit,
    maxChars,
    lookbackDays,
    maxDate,
    from,
    marker,
    repoFilter,
    repoFullName
  };
}
async function loadStyleCache(params) {
  const { token, maxChars, logger } = params;
  const cacheConfig = getStyleCacheConfig();
  if (!cacheConfig) {
    return { cacheConfig: null, cacheComment: null, cached: null };
  }
  const comments = await fetchIssueComments({
    owner: cacheConfig.owner,
    repo: cacheConfig.repo,
    issueNumber: cacheConfig.issueNumber,
    token,
    logger
  });
  const cacheComment = findStyleCacheComment(comments, cacheConfig.markerRegex);
  const cached = cacheComment?.body ? parseStyleCacheComment(cacheComment.body, cacheConfig.markerRegex, maxChars) : null;
  return { cacheConfig, cacheComment, cached };
}
function getCachedStyleExamples(params) {
  const { cached, cacheConfig, repoFullName, login, limit, lookbackDays, source } = params;
  if (!cached || !cacheConfig || !repoFullName) return null;
  if (!isStyleCacheUsable(cached, { login, repo: repoFullName, limit, lookbackDays, ttlMs: cacheConfig.ttlMs, source })) return null;
  return cached.examples.slice(0, limit);
}
function canUseVectorDbSource(params) {
  const { source, vectorConfig, raw, logger } = params;
  if (source !== "vector-db") return true;
  if (vectorConfig) return true;
  if (raw === "vector-db") {
    logger.info("[codexAgent] Vector DB style fetch skipped: missing config", { source });
  }
  return false;
}
async function fetchExamplesForSource(params) {
  const { source, login, token, vectorConfig, from, maxDate, limit, marker, maxChars, repoFilter, headers, logger } = params;
  if (source === "vector-db") {
    if (!vectorConfig) return [];
    return collectStyleExamplesFromVectorDb({
      login,
      token,
      config: vectorConfig,
      from,
      maxDate,
      limit,
      marker,
      maxChars,
      repoFilter,
      logger
    });
  }
  return collectStyleExamples({
    login,
    from,
    headers,
    limit,
    marker,
    maxChars,
    repoFilter,
    logger
  });
}
async function maybeUpdateStyleCache(params) {
  const { cacheConfig, cacheComment, token, payload, logger } = params;
  if (!cacheConfig?.shouldWriteCache) return;
  await upsertStyleCacheComment({
    owner: cacheConfig.owner,
    repo: cacheConfig.repo,
    issueNumber: cacheConfig.issueNumber,
    commentId: cacheComment?.id,
    body: buildStyleCacheBody(cacheConfig.markerLabel, payload),
    token,
    logger
  });
  logger.info("[codexAgent] Style cache updated", {
    count: payload.examples.length,
    issue: `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}`,
    source: payload.source
  });
}
async function fetchStyleExamples(params) {
  const { login, owner, repo, token, logger } = params;
  if (!token) return [];
  const settings = getStyleFetchSettings({ owner, repo });
  if (settings.limit === 0) return [];
  const { cacheConfig, cacheComment, cached } = await loadStyleCache({
    token,
    maxChars: settings.maxChars,
    logger
  });
  const { order, raw } = getStyleSourceOrder();
  const vectorConfig = getVectorDbConfig();
  const headers = buildHeaders(token);
  for (const source of order) {
    if (!canUseVectorDbSource({ source, vectorConfig, raw, logger })) continue;
    const cachedExamples = getCachedStyleExamples({
      cached,
      cacheConfig,
      repoFullName: settings.repoFullName,
      login,
      limit: settings.limit,
      lookbackDays: settings.lookbackDays,
      source
    });
    if (cachedExamples) {
      logger.info("[codexAgent] Style cache hit", {
        count: cachedExamples.length,
        issue: cacheConfig ? `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}` : "",
        source
      });
      return cachedExamples;
    }
    const examples = await fetchExamplesForSource({
      source,
      login,
      token,
      vectorConfig,
      from: settings.from,
      maxDate: settings.maxDate,
      limit: settings.limit,
      marker: settings.marker,
      maxChars: settings.maxChars,
      repoFilter: settings.repoFilter,
      headers,
      logger
    });
    if (!examples.length) continue;
    await maybeUpdateStyleCache({
      cacheConfig,
      cacheComment,
      token,
      payload: {
        version: STYLE_CACHE_VERSION,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        login,
        repo: settings.repoFullName || void 0,
        lookbackDays: settings.lookbackDays,
        limit: settings.limit,
        maxChars: settings.maxChars,
        source,
        examples
      },
      logger
    });
    return examples;
  }
  return [];
}
async function maybeFetchStyleExamples(args) {
  const { login, owner, repo, logger } = args;
  const isStyleFetchEnabled = parseBool(getEnvString(["PROMPT_FETCH_STYLE", "UOS_STYLE_FETCH"], "1"), true);
  if (!isStyleFetchEnabled) return [];
  if (!login) return [];
  try {
    const token = selectPatToken();
    if (!token) return [];
    return await fetchStyleExamples({ login, owner, repo, token, logger });
  } catch (error) {
    logger.info("[codexAgent] Style fetch failed (non-fatal)", { error: String(error) });
    return [];
  }
}
var STYLE_CACHE_VERSION, DEFAULT_STYLE_CACHE_MARKER, DEFAULT_REPLY_MARKER, SENSITIVE_PATTERNS, STYLE_QUERY;
var init_github = __esm({
  "src/handlers/codex-agent/lib/github.ts"() {
    "use strict";
    init_esm_shims();
    init_config();
    init_utils();
    STYLE_CACHE_VERSION = 1;
    DEFAULT_STYLE_CACHE_MARKER = "pa:style-cache";
    DEFAULT_REPLY_MARKER = "pa:ai";
    SENSITIVE_PATTERNS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/i, /private_key/i];
    STYLE_QUERY = `query($login: String!, $cursor: String) {
  user(login: $login) {
    issueComments(first: 50, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { body createdAt updatedAt url repository { nameWithOwner } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
  }
});

// src/handlers/codex-agent/lib/prompt.ts
function formatStyleExamples(examples, agentOwner) {
  if (!examples.length) return "";
  const lines = examples.map((example) => {
    const meta = [];
    if (example.repo) meta.push(example.repo);
    if (example.createdAt) meta.push(example.createdAt.slice(0, 10));
    const prefix = meta.length ? `(${meta.join(", ")}) ` : "";
    return `- ${prefix}${example.body}`;
  });
  return `Writing style samples from @${agentOwner} (for tone only; do not quote verbatim):
${lines.join("\n")}`;
}
function buildRichPrompt(args) {
  const { accessLevel, isPr, owner, repo, issueNumber, sender, agentOwner, command, styleExamples } = args;
  const styleBlock = formatStyleExamples(styleExamples ?? [], agentOwner);
  const base = `
  [mode:${accessLevel}] [type:${isPr ? "pr" : "issue"}] repo:${owner}/${repo} ${isPr ? "pr" : "issue"}:${issueNumber} actor:${sender}
  Environment: Linux shell with GitHub CLI (gh) available and authenticated with a GitHub token.
  You are a GitHub assistant. You always return a single GitHub comment (no preamble, no wrappers).
  You are ${agentOwner}. Write in ${agentOwner}'s voice and perspective.

  User request:
  ${command}${styleBlock ? "\n\n" + styleBlock : ""}

  Output Contract:
  - Output only the final comment text to post on GitHub.
  - Do NOT include role labels (assistant:, system:, user:), system messages, logs, markers (e.g., GH_*_OK), transcripts, or thinking.
  - Do NOT @mention any user or team (avoid loops). If you must reference a handle, render as plain text or code.

  Style and Formatting (GitHub-flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Do NOT wrap the entire response in a code block; only fence code/diff/json snippets.
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1-3 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.
  - Keep it concise: target about 800 characters unless a longer list is explicitly requested.

  Content Rules:
  - Always prefer live reads over inference: if the answer depends on repository data (labels, files, commits, diffs, milestones, prices, etc.), use gh or the GitHub API to read it first; do not guess or invent values.
  - Summarize results; do not echo command lines or transcripts.
  - If context is insufficient or shell access fails, state the single additional input or permission you need in one line, then proceed with what can be done now.
  - When asked for a plan, produce a short, numbered list (5-8 items max), each one line.
  - When asked for acceptance criteria, use bullets with clear, testable statements (concise Given/When/Then is fine).

  Safety and Etiquette:
  - No secrets or tokens.
  - Do not self-trigger loops (no mentions in output).

  Produce only the final GitHub comment now.`;
  return base.replace(/\n\s+/g, "\n");
}
var init_prompt = __esm({
  "src/handlers/codex-agent/lib/prompt.ts"() {
    "use strict";
    init_esm_shims();
    init_github();
    init_config();
    init_utils();
  }
});

// src/handlers/codex-agent/lib/kv-client.ts
function getEnvValue(key) {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    if (value !== void 0) return value;
  }
  const deno = globalThis.Deno;
  if (deno?.env?.get) return deno.env.get(key);
  return void 0;
}
function resolveKvUrl() {
  const raw = getEnvValue("UOS_AGENT_MEMORY_URL");
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.endsWith("/kv") ? trimmed : `${trimmed}/kv`;
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function looksLikeKvLike(value) {
  if (!isRecord(value)) return false;
  return typeof value.get === "function" && typeof value.set === "function" && typeof value.list === "function";
}
function encodeKeyPart(part) {
  if (typeof part === "string") return part;
  if (typeof part === "number" || typeof part === "bigint") return String(part);
  if (typeof part === "boolean") return part ? "true" : "false";
  return String(part);
}
function buildKeyPath(key) {
  return key.map((part) => encodeURIComponent(encodeKeyPart(part))).join("/");
}
function createPiKvClient(baseUrl) {
  const base = baseUrl.replace(/\/+$/, "");
  async function fetchJson(url, init) {
    const res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...init.headers ?? {}
      }
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Pi KV request failed (${res.status}): ${text}`);
    }
    return await res.json();
  }
  return {
    supportsReverse: false,
    async get(key) {
      const url = `${base}/${buildKeyPath(key)}`;
      const response = await fetchJson(url, { method: "GET" });
      const hasValue = Object.prototype.hasOwnProperty.call(response, "value");
      return { value: hasValue ? response.value : null };
    },
    async set(key, value, options) {
      const url = `${base}/${buildKeyPath(key)}`;
      const payload = { value };
      if (options?.expireIn !== void 0) payload.expireIn = options.expireIn;
      await fetchJson(url, { method: "POST", body: JSON.stringify(payload) });
      return null;
    },
    list(selector, options = {}) {
      if (options.reverse) {
        throw new Error("Pi KV does not support reverse iteration");
      }
      const payload = {
        prefix: selector.prefix,
        limit: options.limit,
        cursor: options.cursor
      };
      const url = `${base}/list`;
      const iterator2 = {
        cursor: "",
        async *[Symbol.asyncIterator]() {
          const response = await fetchJson(url, {
            method: "POST",
            body: JSON.stringify(payload)
          });
          iterator2.cursor = response.cursor ?? "";
          for (const entry of response.entries ?? []) {
            yield { key: entry.key, value: entry.value };
          }
        }
      };
      return iterator2;
    }
  };
}
async function getKvClient(logger) {
  if (kvClientPromise) return kvClientPromise;
  kvClientPromise = (async () => {
    const memoryUrl = resolveKvUrl();
    if (memoryUrl) {
      return createPiKvClient(memoryUrl);
    }
    const deno = globalThis.Deno;
    if (!deno || typeof deno.openKv !== "function") return null;
    try {
      const kv = await deno.openKv();
      if (!looksLikeKvLike(kv)) return null;
      return {
        get: kv.get.bind(kv),
        set: kv.set.bind(kv),
        list: kv.list.bind(kv),
        supportsReverse: true
      };
    } catch (error) {
      if (logger?.debug) logger.debug({ err: error }, "Failed to open Deno KV (non-fatal)");
      return null;
    }
  })();
  return kvClientPromise;
}
var kvClientPromise;
var init_kv_client = __esm({
  "src/handlers/codex-agent/lib/kv-client.ts"() {
    "use strict";
    init_esm_shims();
    kvClientPromise = null;
  }
});

// src/handlers/codex-agent/lib/agent-memory.ts
function toBufferSource(bytes) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}
function warnOnce(logger, key, message, err) {
  if (!logger || typeof logger.warn !== "function" || warned.has(key)) return;
  warned.add(key);
  if (err !== void 0) {
    logger.warn({ err }, message);
  } else {
    logger.warn(message);
  }
}
function isRecord2(value) {
  return typeof value === "object" && value !== null;
}
function normalizeString(value) {
  return typeof value === "string" ? value : "";
}
function clampText(value, maxChars) {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}
function getEnvValue2(key) {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    if (value !== void 0) return value;
  }
  const deno = globalThis.Deno;
  if (deno?.env?.get) return deno.env.get(key);
  return void 0;
}
function normalizeBase64(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = normalized.length % 4;
  if (padLength === 0) return normalized;
  return `${normalized}${"=".repeat(4 - padLength)}`;
}
function decodeBase64Bytes(input) {
  const normalized = normalizeBase64(input);
  if (!normalized) return null;
  const atobFn = globalThis.atob;
  if (typeof atobFn !== "function") return null;
  try {
    const binary = atobFn(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}
async function getMemoryCryptoKey(logger) {
  if (memoryKeyPromise) return memoryKeyPromise;
  memoryKeyPromise = (async () => {
    const raw = getEnvValue2("UOS_AGENT_MEMORY_KEY");
    if (!raw) {
      warnOnce(logger, "agent-memory-key-missing", "UOS_AGENT_MEMORY_KEY is not set; agent memory persistence is disabled.");
      return null;
    }
    const bytes = decodeBase64Bytes(raw);
    if (!bytes) {
      warnOnce(logger, "agent-memory-key-invalid", "UOS_AGENT_MEMORY_KEY must be base64-encoded 32 bytes.");
      return null;
    }
    if (bytes.length !== 32) {
      warnOnce(logger, "agent-memory-key-length", "UOS_AGENT_MEMORY_KEY must decode to 32 bytes for AES-256-GCM.");
      return null;
    }
    try {
      return await crypto.subtle.importKey("raw", toBufferSource(bytes), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    } catch (error) {
      warnOnce(logger, "agent-memory-key-import", "Failed to import UOS_AGENT_MEMORY_KEY.", error);
      return null;
    }
  })();
  return memoryKeyPromise;
}
async function decompressBytes(payload) {
  const ctor = globalThis.DecompressionStream;
  if (!ctor) {
    throw new Error("DecompressionStream is unavailable");
  }
  const stream = new ctor("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(toBufferSource(payload));
  await writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}
function isMemoryEnvelope(value) {
  if (!isRecord2(value)) return false;
  return value.v === 1 && value.alg === "A256GCM" && value.codec === "json+gzip" && typeof value.iv === "string" && typeof value.data === "string";
}
async function decodeEntry(value, logger) {
  if (isMemoryEnvelope(value)) {
    const key = await getMemoryCryptoKey(logger);
    if (!key) return null;
    const iv = decodeBase64Bytes(value.iv);
    const data = decodeBase64Bytes(value.data);
    if (!iv || !data) {
      warnOnce(logger, "agent-memory-envelope-base64", "Failed to decode agent memory payload.");
      return null;
    }
    try {
      const ivSource = toBufferSource(iv);
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivSource }, key, toBufferSource(data));
      const decompressed = await decompressBytes(new Uint8Array(plaintext));
      const parsed = JSON.parse(textDecoder.decode(decompressed));
      return parseEntryRecord(parsed);
    } catch (error) {
      warnOnce(logger, "agent-memory-envelope-decrypt", "Failed to decrypt agent memory entry.", error);
      return null;
    }
  }
  return parseEntryRecord(value);
}
function normalizeScopeKey(scopeKey) {
  return typeof scopeKey === "string" ? scopeKey.trim() : "";
}
function buildKvKey(owner, repo, scopeKey) {
  const scope = normalizeScopeKey(scopeKey);
  if (scope) return ["ubiquityos", "agent", "memory", "scope", scope, "events"];
  return ["ubiquityos", "agent", "memory", owner, repo, "events"];
}
function buildMapKey(owner, repo, scopeKey) {
  const scope = normalizeScopeKey(scopeKey);
  if (scope) return `scope:${scope}`;
  return `${owner}/${repo}`;
}
async function getKv(logger) {
  if (kvPromise) return kvPromise;
  kvPromise = (async () => {
    const kv = await getKvClient(logger);
    if (!kv) return null;
    const key = await getMemoryCryptoKey(logger);
    if (!key) return null;
    return kv;
  })();
  return kvPromise;
}
function parseEntryRecord(value) {
  if (!isRecord2(value) || value.kind !== "agent_run") return null;
  const stateId = normalizeString(value.stateId).trim();
  const status = normalizeString(value.status).trim();
  const updatedAt = normalizeString(value.updatedAt).trim();
  const issueNumber = typeof value.issueNumber === "number" && Number.isFinite(value.issueNumber) ? Math.trunc(value.issueNumber) : null;
  if (!stateId || !status || !updatedAt || issueNumber === null) return null;
  return {
    kind: "agent_run",
    stateId,
    status,
    issueNumber,
    updatedAt,
    runUrl: normalizeString(value.runUrl).trim() || void 0,
    prUrl: normalizeString(value.prUrl).trim() || void 0,
    summary: clampText(normalizeString(value.summary), SUMMARY_MAX_CHARS) || void 0
  };
}
async function readEntriesFromKv(kv, owner, repo, limit, logger, scopeKey) {
  const scanLimit = Math.max(limit * 12, limit);
  const prefix = buildKvKey(owner, repo, scopeKey);
  const entries = [];
  if (kv.supportsReverse !== false) {
    try {
      for await (const item of kv.list({ prefix }, { reverse: true, limit: scanLimit })) {
        const parsed = await decodeEntry(item.value, logger);
        if (parsed) entries.push(parsed);
      }
      return entries;
    } catch (error) {
      warnOnce(logger, "agent-memory-list", "Failed to list agent memory entries.", error);
      return [];
    }
  }
  const buffer = [];
  let cursor;
  try {
    do {
      const iterator2 = kv.list({ prefix }, { limit: LIST_PAGE_SIZE, cursor });
      for await (const item of iterator2) {
        const parsed = await decodeEntry(item.value, logger);
        if (!parsed) continue;
        buffer.push(parsed);
        if (buffer.length > scanLimit) buffer.shift();
      }
      cursor = iterator2.cursor ? String(iterator2.cursor) : "";
    } while (cursor);
  } catch (error) {
    warnOnce(logger, "agent-memory-list", "Failed to list agent memory entries.", error);
    return [];
  }
  buffer.reverse();
  return buffer;
}
async function getAgentMemorySnippet(params) {
  const owner = params.owner.trim();
  const repo = params.repo.trim();
  const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ? Math.max(0, Math.trunc(params.limit)) : 6;
  const maxChars = typeof params.maxChars === "number" && Number.isFinite(params.maxChars) ? Math.max(200, Math.trunc(params.maxChars)) : 2e3;
  if (!owner || !repo || limit === 0) return "";
  const kv = await getKv(params.logger);
  const entries = [];
  const scope = normalizeScopeKey(params.scopeKey);
  if (kv) {
    entries.push(...await readEntriesFromKv(kv, owner, repo, limit, params.logger, scope || void 0));
  }
  const key = buildMapKey(owner, repo, scope || void 0);
  const localEntries = inMemory.get(key) ?? [];
  if (localEntries.length > 0) {
    entries.push(...localEntries.slice(-IN_MEMORY_MAX_ENTRIES).reverse());
  }
  if (entries.length === 0 && scope) {
    if (kv) {
      entries.push(...await readEntriesFromKv(kv, owner, repo, limit, params.logger));
    }
    const repoKey = buildMapKey(owner, repo);
    const repoEntries = inMemory.get(repoKey) ?? [];
    if (repoEntries.length > 0) {
      entries.push(...repoEntries.slice(-IN_MEMORY_MAX_ENTRIES).reverse());
    }
  }
  if (entries.length === 0) return "";
  const seen = /* @__PURE__ */ new Set();
  const lines = [];
  for (const e of entries) {
    if (seen.has(e.stateId)) continue;
    seen.add(e.stateId);
    const summaryFirstLine = (e.summary ?? "").split(/\r?\n/)[0]?.trim();
    const headline = summaryFirstLine ? clampText(summaryFirstLine, 180) : "";
    const parts = [`[${e.updatedAt}]`, `#${e.issueNumber}`, e.status];
    if (headline) parts.push(`- ${headline}`);
    lines.push(`- ${parts.join(" ")}`);
    if (lines.length >= limit) break;
  }
  return clampText(lines.join("\n"), maxChars);
}
var SUMMARY_MAX_CHARS, IN_MEMORY_MAX_ENTRIES, LIST_PAGE_SIZE, inMemory, kvPromise, memoryKeyPromise, warned, textEncoder, textDecoder;
var init_agent_memory = __esm({
  "src/handlers/codex-agent/lib/agent-memory.ts"() {
    "use strict";
    init_esm_shims();
    init_kv_client();
    SUMMARY_MAX_CHARS = 1200;
    IN_MEMORY_MAX_ENTRIES = 250;
    LIST_PAGE_SIZE = 200;
    inMemory = /* @__PURE__ */ new Map();
    kvPromise = null;
    memoryKeyPromise = null;
    warned = /* @__PURE__ */ new Set();
    textEncoder = new TextEncoder();
    textDecoder = new TextDecoder();
  }
});

// src/handlers/codex-agent/lib/conversation-graph.ts
function createGraph() {
  return { nodes: /* @__PURE__ */ new Map(), edges: /* @__PURE__ */ new Set() };
}
function edgeKey(a, b) {
  return [a, b].sort((left, right) => left.localeCompare(right)).join("|");
}
function addNode(graph, id, node) {
  graph.nodes.set(id, node);
}
function hasNode(graph, id) {
  return graph.nodes.has(id);
}
function addEdge(graph, a, b) {
  graph.edges.add(edgeKey(a, b));
}
function hasEdge(graph, a, b) {
  return graph.edges.has(edgeKey(a, b));
}
function listNodeIds(graph) {
  return [...graph.nodes.keys()];
}
function getNodeAttributes(graph, id) {
  return graph.nodes.get(id) ?? null;
}
function isRecord3(value) {
  return typeof value === "object" && value !== null;
}
function normalizeString2(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  return void 0;
}
function nodeKey(nodeId) {
  return [...KV_ROOT, "node", nodeId];
}
function aliasKey(key) {
  return [...KV_ROOT, "alias", key];
}
function keyNodesPrefix(key) {
  return [...KV_ROOT, "key", key, "nodes"];
}
function keyNodeKey(key, nodeId) {
  return [...keyNodesPrefix(key), nodeId];
}
function parseNodeRecord(value) {
  if (!isRecord3(value)) return null;
  const id = normalizeString2(value.id);
  const key = normalizeString2(value.key);
  const type = normalizeString2(value.type);
  const createdAt = normalizeString2(value.createdAt);
  const url = normalizeString2(value.url);
  const owner = normalizeString2(value.owner);
  const repo = normalizeString2(value.repo);
  if (!id || !key || !type || !createdAt || !url || !owner || !repo) return null;
  const number = normalizeNumber(value.number);
  const title = normalizeString2(value.title) || void 0;
  const updatedAt = normalizeString2(value.updatedAt) || (/* @__PURE__ */ new Date()).toISOString();
  return {
    id,
    key,
    type,
    createdAt,
    url,
    owner,
    repo,
    number,
    title,
    updatedAt
  };
}
function parseConversationNode(value) {
  if (!isRecord3(value)) return null;
  const type = normalizeString2(value.__typename);
  if (type !== "Issue" && type !== "PullRequest") return null;
  const id = normalizeString2(value.id);
  const createdAt = normalizeString2(value.createdAt);
  const url = normalizeString2(value.url);
  let owner = "";
  let repo = "";
  if (isRecord3(value.repository)) {
    const repoName = normalizeString2(value.repository.name);
    const ownerLogin = isRecord3(value.repository.owner) ? normalizeString2(value.repository.owner.login) : "";
    owner = ownerLogin;
    repo = repoName;
  }
  if ((!owner || !repo) && url) {
    const parsed = parseOwnerRepoFromUrl(url);
    owner = owner || parsed.owner;
    repo = repo || parsed.repo;
  }
  if (!id || !createdAt || !url || !owner || !repo) return null;
  const number = normalizeNumber(value.number);
  const title = normalizeString2(value.title) || void 0;
  return {
    id,
    type,
    createdAt,
    url,
    owner,
    repo,
    number,
    title
  };
}
function parseOwnerRepoFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch {
    return { owner: "", repo: "" };
  }
  return { owner: "", repo: "" };
}
function parseGithubReferenceUrl(raw) {
  try {
    const parsed = new URL(raw, "https://github.com");
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    const owner = normalizeString2(parts[0]);
    const repo = normalizeString2(parts[1]);
    const segment = normalizeString2(parts[2]).toLowerCase();
    const number = normalizeNumber(Number(parts[3]));
    if (!owner || !repo || number === void 0) return null;
    if (segment === "issues") {
      return { owner, repo, number, kind: "Issue" };
    }
    if (segment === "pull" || segment === "pulls") {
      return { owner, repo, number, kind: "PullRequest" };
    }
    return null;
  } catch {
    return null;
  }
}
function extractReferencesFromHtml(html) {
  const out = [];
  const trimmed = html.trim();
  if (!trimmed) return out;
  const hrefRegex = /href="([^"]+)"/gi;
  for (const match of trimmed.matchAll(hrefRegex)) {
    const href = normalizeString2(match[1]);
    if (!href) continue;
    const ref = parseGithubReferenceUrl(href);
    if (ref) out.push(ref);
  }
  return out;
}
function extractReferencesFromText(text) {
  const out = [];
  const trimmed = text.trim();
  if (!trimmed) return out;
  const urlRegex = /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull|pulls)\/(\d+)/gi;
  for (const match of trimmed.matchAll(urlRegex)) {
    const owner = normalizeString2(match[1]);
    const repo = normalizeString2(match[2]);
    const number = normalizeNumber(Number(match[4]));
    if (!owner || !repo || number === void 0) continue;
    const segment = normalizeString2(match[3]).toLowerCase();
    const kind = segment === "pull" || segment === "pulls" ? "PullRequest" : "Issue";
    out.push({ owner, repo, number, kind });
  }
  const repoRegex = /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)\b/g;
  for (const match of trimmed.matchAll(repoRegex)) {
    const owner = normalizeString2(match[1]);
    const repo = normalizeString2(match[2]);
    const number = normalizeNumber(Number(match[3]));
    if (!owner || !repo || number === void 0) continue;
    out.push({ owner, repo, number, kind: "Unknown" });
  }
  return out;
}
function dedupeReferences(references) {
  const map = /* @__PURE__ */ new Map();
  for (const ref of references) {
    const key = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.number}`;
    const current = map.get(key);
    if (!current || current.kind === "Unknown" && ref.kind !== "Unknown") {
      map.set(key, ref);
    }
  }
  return [...map.values()];
}
function isSameReference(root, ref) {
  if (root.number === void 0) return false;
  return root.owner.toLowerCase() === ref.owner.toLowerCase() && root.repo.toLowerCase() === ref.repo.toLowerCase() && root.number === ref.number;
}
function getGraphqlClient(context) {
  const octokit = context.octokit;
  if (typeof octokit.graphql === "function") {
    return octokit.graphql;
  }
  const request3 = octokit.request;
  if (typeof request3 !== "function") {
    return null;
  }
  return async (query, variables) => {
    const response = await request3("POST /graphql", { query, variables });
    return response.data ?? response;
  };
}
async function fetchIssueNode(context, owner, repo, number) {
  const { data } = await context.octokit.rest.issues.get({ owner, repo, issue_number: number });
  if (data.pull_request) {
    return fetchPullRequestNode(context, owner, repo, number);
  }
  return parseConversationNode({
    __typename: "Issue",
    id: data.node_id,
    number: data.number,
    title: data.title,
    url: data.html_url ?? data.url,
    createdAt: data.created_at,
    repository: { name: repo, owner: { login: owner } }
  });
}
async function fetchPullRequestNode(context, owner, repo, number) {
  const { data } = await context.octokit.rest.pulls.get({ owner, repo, pull_number: number });
  return parseConversationNode({
    __typename: "PullRequest",
    id: data.node_id,
    number: data.number,
    title: data.title,
    url: data.html_url ?? data.url,
    createdAt: data.created_at,
    repository: { name: repo, owner: { login: owner } }
  });
}
async function fetchReferenceNode(context, reference) {
  const owner = normalizeString2(reference.owner);
  const repo = normalizeString2(reference.repo);
  if (!owner || !repo || !Number.isFinite(reference.number)) return null;
  const number = Math.trunc(reference.number);
  try {
    if (reference.kind === "PullRequest") {
      return await fetchPullRequestNode(context, owner, repo, number);
    }
    if (reference.kind === "Issue") {
      return await fetchIssueNode(context, owner, repo, number);
    }
    return await fetchIssueNode(context, owner, repo, number);
  } catch (error) {
    context.logger.debug({ err: error, owner, repo, number }, "Failed to resolve outbound reference (non-fatal)");
    return null;
  }
}
async function fetchOutboundReferences(context, root) {
  const owner = normalizeString2(root.owner);
  const repo = normalizeString2(root.repo);
  const issueNumber = root.number;
  if (!owner || !repo || issueNumber === void 0) return [];
  let body = "";
  let bodyHtml = "";
  try {
    const { data } = await context.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
      headers: { accept: "application/vnd.github.v3.html+json" }
    });
    body = typeof data.body === "string" ? data.body : "";
    bodyHtml = typeof data.body_html === "string" ? data.body_html : "";
  } catch (error) {
    context.logger.debug({ err: error, owner, repo, issueNumber }, "Failed to fetch issue body for outbound references (non-fatal)");
    return [];
  }
  const rawReferences = bodyHtml ? extractReferencesFromHtml(bodyHtml) : extractReferencesFromText(body);
  try {
    const { data: comments } = await context.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: OUTBOUND_COMMENT_LIMIT,
      sort: "created",
      direction: "desc",
      headers: { accept: "application/vnd.github.v3.html+json" }
    });
    for (const comment of comments ?? []) {
      const html = typeof comment?.body_html === "string" ? comment.body_html : "";
      const text = typeof comment?.body === "string" ? comment.body : "";
      if (html) {
        rawReferences.push(...extractReferencesFromHtml(html));
      } else if (text) {
        rawReferences.push(...extractReferencesFromText(text));
      }
    }
  } catch (error) {
    context.logger.debug({ err: error, owner, repo, issueNumber }, "Failed to fetch issue comments for outbound references (non-fatal)");
  }
  const references = dedupeReferences(rawReferences).filter((ref) => !isSameReference(root, ref)).slice(0, OUTBOUND_REFERENCE_LIMIT);
  const nodes = [];
  for (const ref of references) {
    const node = await fetchReferenceNode(context, ref);
    if (node && node.id !== root.id) nodes.push(node);
  }
  return nodes;
}
async function fetchConversationSnapshot(context, nodeId) {
  const graphql3 = getGraphqlClient(context);
  if (!graphql3) return null;
  const issueOrPullFields = `
                __typename
                ... on Issue {
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              `;
  try {
    const data = await graphql3(
      `
        query ($nodeId: ID!, $timelineCount: Int!, $closingCount: Int!) {
          node(id: $nodeId) {
            __typename
            ... on Issue {
              id
              number
              title
              url
              createdAt
              repository {
                name
                owner {
                  login
                }
              }
              timelineItems(first: $timelineCount, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) {
                nodes {
                  ... on CrossReferencedEvent {
                    source {${issueOrPullFields}}
                    target {${issueOrPullFields}}
                  }
                  ... on ConnectedEvent {
                    source {${issueOrPullFields}}
                    subject {${issueOrPullFields}}
                  }
                }
              }
            }
            ... on PullRequest {
              id
              number
              title
              url
              createdAt
              repository {
                name
                owner {
                  login
                }
              }
              closingIssuesReferences(first: $closingCount) {
                nodes {
                  __typename
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              }
              timelineItems(first: $timelineCount, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) {
                nodes {
                  ... on CrossReferencedEvent {
                    source {${issueOrPullFields}}
                    target {${issueOrPullFields}}
                  }
                  ... on ConnectedEvent {
                    source {${issueOrPullFields}}
                    subject {${issueOrPullFields}}
                  }
                }
              }
            }
          }
        }
      `,
      {
        nodeId,
        timelineCount: TIMELINE_PAGE_SIZE,
        closingCount: CLOSING_PAGE_SIZE
      }
    );
    const root = parseConversationNode(data.node);
    if (!root) return null;
    const linked = [];
    const timelineItems = isRecord3(data.node?.timelineItems) ? data.node?.timelineItems : null;
    if (timelineItems && Array.isArray(timelineItems.nodes)) {
      for (const item of timelineItems.nodes) {
        if (!isRecord3(item)) continue;
        for (const candidate of [item.source, item.subject, item.target]) {
          const parsed = parseConversationNode(candidate);
          if (parsed && parsed.id !== root.id) linked.push(parsed);
        }
      }
    }
    if (isRecord3(data.node?.closingIssuesReferences) && Array.isArray(data.node?.closingIssuesReferences.nodes)) {
      for (const node of data.node?.closingIssuesReferences.nodes ?? []) {
        const parsed = parseConversationNode(node);
        if (parsed && parsed.id !== root.id) linked.push(parsed);
      }
    }
    return { root, linked };
  } catch (error) {
    context.logger.debug({ err: error }, "Failed to fetch conversation links (non-fatal)");
    return null;
  }
}
async function getSubjectNode(context) {
  const payload = context.payload;
  const repository = payload.repository;
  const owner = normalizeString2(repository?.owner?.login);
  const repo = normalizeString2(repository?.name);
  if ("pull_request" in payload && isRecord3(payload.pull_request)) {
    const pr = payload.pull_request;
    const node = parseConversationNode({
      __typename: "PullRequest",
      id: pr.node_id,
      number: pr.number,
      title: pr.title,
      url: pr.html_url ?? pr.url,
      createdAt: pr.created_at,
      repository: { name: repo, owner: { login: owner } }
    });
    if (node) return node;
  }
  if ("issue" in payload && isRecord3(payload.issue)) {
    const issue = payload.issue;
    const isPullRequest = Boolean(issue.pull_request);
    if (isPullRequest && owner && repo && typeof issue.number === "number") {
      try {
        const { data } = await context.octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: issue.number
        });
        const node2 = parseConversationNode({
          __typename: "PullRequest",
          id: data.node_id,
          number: data.number,
          title: data.title,
          url: data.html_url ?? data.url,
          createdAt: data.created_at,
          repository: { name: repo, owner: { login: owner } }
        });
        if (node2) return node2;
      } catch (error) {
        context.logger.debug({ err: error }, "Failed to hydrate PR node for issue comment (non-fatal)");
      }
    }
    const node = parseConversationNode({
      __typename: "Issue",
      id: issue.node_id,
      number: issue.number,
      title: issue.title,
      url: issue.html_url ?? issue.url,
      createdAt: issue.created_at,
      repository: { name: repo, owner: { login: owner } }
    });
    if (node) return node;
  }
  return null;
}
async function resolveAliasKey(kv, key) {
  if (aliasCache.has(key)) return aliasCache.get(key) ?? key;
  let current = key;
  for (let i = 0; i < MAX_ALIAS_DEPTH; i += 1) {
    const { value } = await kv.get(aliasKey(current));
    const next = normalizeString2(value);
    if (!next) break;
    current = next;
  }
  aliasCache.set(key, current);
  return current;
}
async function getNodeRecord(kv, nodeId) {
  const { value } = await kv.get(nodeKey(nodeId));
  return parseNodeRecord(value);
}
function pickCanonicalNode(nodes) {
  return [...nodes].sort((a, b) => compareNodes(a, b))[0] ?? nodes[0];
}
function compareNodes(a, b) {
  const typeRank = (node) => node.type === "Issue" ? 0 : 1;
  const rankDiff = typeRank(a) - typeRank(b);
  if (rankDiff !== 0) return rankDiff;
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const aScore = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER;
  const bScore = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER;
  if (aScore !== bScore) return aScore - bScore;
  return a.id.localeCompare(b.id);
}
async function listNodesForKey(kv, key) {
  const prefix = keyNodesPrefix(key);
  const nodeIds = [];
  let cursor;
  try {
    do {
      const iterator2 = kv.list({ prefix }, { limit: LIST_PAGE_SIZE2, cursor });
      for await (const entry of iterator2) {
        const parts = entry.key;
        const nodeId = parts[parts.length - 1];
        if (typeof nodeId === "string" && nodeId.trim()) nodeIds.push(nodeId);
      }
      cursor = iterator2.cursor ? String(iterator2.cursor) : "";
    } while (cursor);
  } catch {
    return nodeIds;
  }
  return nodeIds;
}
async function persistNode(kv, node, key) {
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const record = { ...node, key, updatedAt };
  await kv.set(nodeKey(node.id), record);
  await kv.set(keyNodeKey(key, node.id), 1);
}
async function mergeKeys(kv, fromKey, toKey) {
  if (fromKey === toKey) return;
  await kv.set(aliasKey(fromKey), toKey);
  const nodeIds = await listNodesForKey(kv, fromKey);
  for (const nodeId of nodeIds) {
    const record = await getNodeRecord(kv, nodeId);
    if (!record) continue;
    await persistNode(
      kv,
      { ...record, id: nodeId, type: record.type, createdAt: record.createdAt, url: record.url, owner: record.owner, repo: record.repo },
      toKey
    );
  }
}
function buildGraph(root, linked) {
  const graph = createGraph();
  addNode(graph, root.id, root);
  for (const node of linked) {
    if (!hasNode(graph, node.id)) addNode(graph, node.id, node);
    if (!hasEdge(graph, root.id, node.id)) {
      addEdge(graph, root.id, node.id);
    }
  }
  return graph;
}
function dedupeNodes(nodes) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}
async function resolveConversationKeyForContext(context, logger) {
  const subject = await getSubjectNode(context);
  if (!subject) return null;
  const snapshot = await fetchConversationSnapshot(context, subject.id) ?? { root: subject, linked: [] };
  const outbound = await fetchOutboundReferences(context, snapshot.root);
  const linked = dedupeNodes([...snapshot.linked, ...outbound]);
  const graph = buildGraph(snapshot.root, linked);
  const nodes = listNodeIds(graph).map((id) => getNodeAttributes(graph, id)).filter((node) => Boolean(node));
  const kv = await getKvClient(logger ?? context.logger);
  if (!kv) {
    return { key: snapshot.root.id, root: snapshot.root, linked: snapshot.linked };
  }
  const candidateNodes = [...nodes];
  const existingKeys = /* @__PURE__ */ new Set();
  for (const node of nodes) {
    const record = await getNodeRecord(kv, node.id);
    if (record) {
      const resolvedKey = await resolveAliasKey(kv, record.key);
      existingKeys.add(resolvedKey);
      candidateNodes.push({
        id: record.id,
        type: record.type,
        createdAt: record.createdAt,
        url: record.url,
        owner: record.owner,
        repo: record.repo,
        number: record.number,
        title: record.title
      });
    }
  }
  for (const key of existingKeys) {
    const record = await getNodeRecord(kv, key);
    if (record) {
      candidateNodes.push({
        id: record.id,
        type: record.type,
        createdAt: record.createdAt,
        url: record.url,
        owner: record.owner,
        repo: record.repo,
        number: record.number,
        title: record.title
      });
    }
  }
  const canonical = pickCanonicalNode(dedupeNodes(candidateNodes));
  const canonicalKey = canonical.id;
  if (!hasNode(graph, canonicalKey)) {
    addNode(graph, canonicalKey, canonical);
  }
  for (const key of existingKeys) {
    const resolvedKey = await resolveAliasKey(kv, key);
    if (resolvedKey !== canonicalKey) {
      await mergeKeys(kv, resolvedKey, canonicalKey);
    }
  }
  for (const node of nodes) {
    await persistNode(kv, node, canonicalKey);
  }
  await persistNode(kv, canonical, canonicalKey);
  return { key: canonicalKey, root: snapshot.root, linked };
}
async function listConversationNodesForKey(context, key, limit = 40, logger) {
  const trimmedKey = normalizeString2(key);
  if (!trimmedKey) return [];
  const kv = await getKvClient(logger ?? context.logger);
  if (!kv) return [];
  const nodeIds = await listNodesForKey(kv, trimmedKey);
  const uniqueIds = [...new Set(nodeIds)].slice(0, Math.max(0, limit));
  const nodes = [];
  for (const nodeId of uniqueIds) {
    const record = await getNodeRecord(kv, nodeId);
    if (!record) continue;
    nodes.push({
      id: record.id,
      type: record.type,
      createdAt: record.createdAt,
      url: record.url,
      owner: record.owner,
      repo: record.repo,
      number: record.number,
      title: record.title
    });
  }
  return nodes;
}
var KV_ROOT, LIST_PAGE_SIZE2, MAX_ALIAS_DEPTH, TIMELINE_PAGE_SIZE, CLOSING_PAGE_SIZE, OUTBOUND_COMMENT_LIMIT, OUTBOUND_REFERENCE_LIMIT, aliasCache;
var init_conversation_graph = __esm({
  "src/handlers/codex-agent/lib/conversation-graph.ts"() {
    "use strict";
    init_esm_shims();
    init_kv_client();
    KV_ROOT = ["ubiquityos", "agent", "conversation"];
    LIST_PAGE_SIZE2 = 200;
    MAX_ALIAS_DEPTH = 6;
    TIMELINE_PAGE_SIZE = 100;
    CLOSING_PAGE_SIZE = 50;
    OUTBOUND_COMMENT_LIMIT = 30;
    OUTBOUND_REFERENCE_LIMIT = 25;
    aliasCache = /* @__PURE__ */ new Map();
  }
});

// src/handlers/codex-agent/lib/vector-db.ts
function warnOnce2(logger, key, message) {
  if (!logger || typeof logger.warn !== "function" || warned2.has(key)) return;
  warned2.add(key);
  logger.warn(message);
}
function getEnvValue3(key) {
  if (typeof process !== "undefined" && process.env) {
    const value = process.env[key];
    if (value !== void 0) return value;
  }
  const deno = globalThis.Deno;
  if (deno?.env?.get) return deno.env.get(key);
  return void 0;
}
function getVectorDbConfig2(logger) {
  const rawUrl = getEnvValue3("UOS_VECTOR_DB_URL") ?? getEnvValue3("SUPABASE_URL");
  const rawKey = getEnvValue3("UOS_VECTOR_DB_KEY") ?? getEnvValue3("SUPABASE_SERVICE_ROLE_KEY") ?? getEnvValue3("SUPABASE_KEY") ?? getEnvValue3("SUPABASE_ANON_KEY");
  const projectId = getEnvValue3("SUPABASE_PROJECT_ID");
  const urlCandidate = rawUrl?.trim() ?? "";
  const projectIdValue = projectId?.trim() ?? "";
  let url = "";
  if (urlCandidate) {
    url = urlCandidate.replace(/\/+$/, "");
  } else if (projectIdValue) {
    url = `https://${projectIdValue}.supabase.co`;
  }
  const key = rawKey?.trim() ?? "";
  if (!url || !key) {
    warnOnce2(
      logger,
      "vector-db-missing-config",
      "Vector DB disabled: missing Supabase URL/key. Set UOS_VECTOR_DB_URL/UOS_VECTOR_DB_KEY or SUPABASE_URL + SUPABASE_*_KEY (or SUPABASE_PROJECT_ID)."
    );
    return null;
  }
  return { url, key };
}
function buildRestUrl(config, path3) {
  const suffix = path3.startsWith("/") ? path3 : `/${path3}`;
  return `${config.url}${suffix}`;
}
function buildHeaders2(config) {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json"
  };
}
function buildSelectFields(includeEmbedding) {
  const base = ["id", "doc_type", "markdown", "author_id", "payload"];
  if (includeEmbedding) base.push("embedding");
  return base.join(",");
}
function parseVectorDocument(value) {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const id = typeof record.id === "string" ? record.id : "";
  const docType = typeof record.doc_type === "string" ? record.doc_type : "";
  const markdown = typeof record.markdown === "string" ? record.markdown : null;
  let embedding = null;
  if (Array.isArray(record.embedding)) {
    embedding = record.embedding.filter((n) => typeof n === "number");
  } else if (typeof record.embedding === "string") {
    try {
      const parsed = JSON.parse(record.embedding);
      if (Array.isArray(parsed)) {
        embedding = parsed.filter((n) => typeof n === "number");
      }
    } catch {
      embedding = null;
    }
  }
  let authorId = null;
  if (typeof record.author_id === "number" && Number.isFinite(record.author_id)) {
    authorId = Math.trunc(record.author_id);
  } else if (typeof record.author_id === "string") {
    const parsed = Number(record.author_id);
    if (Number.isFinite(parsed)) authorId = Math.trunc(parsed);
  }
  const payload = record.payload ?? null;
  if (!id || !docType) return null;
  return { id, docType, markdown, embedding, authorId, payload };
}
async function fetchVectorDocument(config, nodeId) {
  const id = nodeId.trim();
  if (!id) return null;
  const url = buildRestUrl(config, `/rest/v1/documents?id=eq.${encodeURIComponent(id)}&select=id,doc_type,markdown,embedding,author_id,payload`);
  const res = await fetch(url, { headers: buildHeaders2(config) });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return parseVectorDocument(data[0]);
}
async function fetchVectorDocuments(config, ids, options = {}) {
  const normalized = ids.map((id) => id.trim()).filter(Boolean);
  if (normalized.length === 0) return [];
  const uniqueIds = [...new Set(normalized)];
  const chunkSize = 25;
  const results = [];
  const select = buildSelectFields(options.includeEmbedding === true);
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const inList = chunk.map((id) => `"${encodeURIComponent(id.replace(/"/g, ""))}"`).join(",");
    const url = buildRestUrl(config, `/rest/v1/documents?id=in.(${inList})&select=${select}`);
    const res = await fetch(url, { headers: buildHeaders2(config) });
    if (!res.ok) continue;
    const data = await res.json();
    if (!Array.isArray(data)) continue;
    for (const item of data) {
      const parsed = parseVectorDocument(item);
      if (parsed) results.push(parsed);
    }
  }
  return results;
}
async function fetchVectorDocumentsByParentId(config, parentId, options = {}) {
  const parent = parentId.trim();
  if (!parent) return [];
  const params = [];
  params.push(`parent_id=eq.${encodeURIComponent(parent)}`);
  if (options.docTypes && options.docTypes.length > 0) {
    const inList = options.docTypes.map((docType) => `"${encodeURIComponent(docType.replace(/"/g, ""))}"`).join(",");
    params.push(`doc_type=in.(${inList})`);
  }
  const select = buildSelectFields(options.includeEmbedding === true);
  params.push(`select=${select}`);
  if (typeof options.maxPerParent === "number" && Number.isFinite(options.maxPerParent) && options.maxPerParent > 0) {
    params.push("order=created_at.desc");
    params.push(`limit=${Math.trunc(options.maxPerParent)}`);
  }
  const url = buildRestUrl(config, `/rest/v1/documents?${params.join("&")}`);
  const res = await fetch(url, { headers: buildHeaders2(config) });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const results = [];
  for (const item of data) {
    const parsed = parseVectorDocument(item);
    if (parsed) results.push(parsed);
  }
  return results;
}
async function findSimilarIssues(config, params) {
  if (!params.currentId.trim() || params.embedding.length === 0) return [];
  const url = buildRestUrl(config, "/rest/v1/rpc/find_similar_issues_annotate");
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders2(config),
    body: JSON.stringify({
      current_id: params.currentId,
      query_embedding: params.embedding,
      threshold: params.threshold,
      top_k: params.topK
    })
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const id = typeof row.issue_id === "string" ? row.issue_id : "";
    const similarity = typeof row.similarity === "number" && Number.isFinite(row.similarity) ? row.similarity : null;
    if (!id || similarity === null) return null;
    return { id, similarity };
  }).filter((row) => Boolean(row));
}
async function findSimilarComments(config, params) {
  if (!params.currentId.trim() || params.embedding.length === 0) return [];
  const url = buildRestUrl(config, "/rest/v1/rpc/find_similar_comments_annotate");
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders2(config),
    body: JSON.stringify({
      current_id: params.currentId,
      query_embedding: params.embedding,
      threshold: params.threshold,
      top_k: params.topK
    })
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const id = typeof row.comment_id === "string" ? row.comment_id : "";
    const similarity = typeof row.similarity === "number" && Number.isFinite(row.similarity) ? row.similarity : null;
    if (!id || similarity === null) return null;
    return { id, similarity };
  }).filter((row) => Boolean(row));
}
var warned2;
var init_vector_db = __esm({
  "src/handlers/codex-agent/lib/vector-db.ts"() {
    "use strict";
    init_esm_shims();
    warned2 = /* @__PURE__ */ new Set();
  }
});

// src/handlers/codex-agent/lib/conversation-context.ts
function clampText2(value, maxChars) {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}
async function mapWithConcurrency(items, limit, handler2) {
  if (items.length === 0) return [];
  const concurrency = Math.max(1, Math.trunc(limit));
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await handler2(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}
function formatNodeLine(node) {
  const typeLabel = node.type === "Issue" ? "Issue" : "PR";
  const repoLabel = node.owner && node.repo ? `${node.owner}/${node.repo}` : "unknown";
  const numberLabel = typeof node.number === "number" ? `#${node.number}` : "";
  const title = node.title ? ` - ${node.title}` : "";
  return `- [${typeLabel}] ${repoLabel}${numberLabel}${title}`;
}
function indentBlock(text, indent) {
  return text.split("\n").map((line) => `${indent}${line}`).join("\n");
}
function normalizeMarkdown(markdown) {
  if (!markdown) return "";
  return markdown.trim();
}
function formatDateLabel(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}
function getCommentKindLabel(kind) {
  if (kind === "IssueComment") return "Issue Comment";
  if (kind === "ReviewComment") return "Review Comment";
  return "Review";
}
function formatCommentLine(comment) {
  const kindLabel = getCommentKindLabel(comment.kind);
  const author = comment.author ? `@${comment.author}` : "unknown";
  const date = formatDateLabel(comment.createdAt);
  const meta = [author, date].filter(Boolean).join(" ");
  return `- [${kindLabel}] ${meta}`.trim();
}
function dedupeNodes2(nodes) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}
function dedupeComments(nodes) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const node of nodes) {
    const key = `${node.kind}:${node.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(node);
  }
  return out;
}
function sortCommentsByDate(nodes) {
  return [...nodes].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    const aScore = Number.isFinite(aTime) ? aTime : 0;
    const bScore = Number.isFinite(bTime) ? bTime : 0;
    return bScore - aScore;
  });
}
function collectParticipantIds(context) {
  const ids = /* @__PURE__ */ new Set();
  const payload = context.payload;
  const issue = isRecord4(payload.issue) ? payload.issue : null;
  const pullRequest = isRecord4(payload.pull_request) ? payload.pull_request : null;
  const comment = isRecord4(payload.comment) ? payload.comment : null;
  const issueUser = isRecord4(issue?.user) ? issue.user : null;
  const prUser = isRecord4(pullRequest?.user) ? pullRequest.user : null;
  const commentUser = isRecord4(comment?.user) ? comment.user : null;
  const issueUserId = typeof issueUser?.id === "number" ? issueUser.id : null;
  const prUserId = typeof prUser?.id === "number" ? prUser.id : null;
  const commentUserId = typeof commentUser?.id === "number" ? commentUser.id : null;
  for (const id of [issueUserId, prUserId, commentUserId]) {
    if (typeof id === "number" && Number.isFinite(id)) ids.add(Math.trunc(id));
  }
  return ids;
}
function isRecord4(value) {
  return typeof value === "object" && value !== null;
}
function buildCommentEntry(kind, payload) {
  let id = "";
  if (typeof payload.node_id === "string") {
    id = payload.node_id;
  } else if (typeof payload.id === "number") {
    id = String(payload.id);
  } else if (typeof payload.id === "string") {
    id = payload.id;
  }
  const createdAt = typeof payload.created_at === "string" ? payload.created_at : "";
  const submittedAt = typeof payload.submitted_at === "string" ? payload.submitted_at : "";
  const timestamp = createdAt || submittedAt;
  let url = "";
  if (typeof payload.html_url === "string") {
    url = payload.html_url;
  } else if (typeof payload.url === "string") {
    url = payload.url;
  }
  const user = isRecord4(payload.user) ? payload.user : null;
  const author = typeof user?.login === "string" ? user.login.trim() : "";
  const rawBody = typeof payload.body === "string" ? payload.body : "";
  if (kind === "Review" && !rawBody.trim()) return null;
  if (!id || !url || !timestamp) return null;
  return {
    id,
    kind,
    createdAt: timestamp,
    url,
    author,
    body: rawBody
  };
}
function getRepositoryOwner(context) {
  const payload = context.payload;
  const repository = isRecord4(payload.repository) ? payload.repository : null;
  const owner = isRecord4(repository?.owner) ? repository?.owner : null;
  return typeof owner?.login === "string" ? owner.login.trim().toLowerCase() : "";
}
async function fetchPagedItems(fetchPage, perPage, maxItems) {
  const items = [];
  let page = 1;
  while (items.length < maxItems) {
    const batch = await fetchPage(page, perPage);
    if (batch.length === 0) break;
    items.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 2e3) break;
  }
  return items.slice(0, maxItems);
}
async function fetchIssueComments2(context, node, maxComments) {
  if (node.number === void 0 || maxComments <= 0) return [];
  try {
    const perPage = Math.min(100, Math.max(1, maxComments));
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.issues.listComments({
          owner: node.owner,
          repo: node.repo,
          issue_number: node.number,
          per_page: pageSize,
          page,
          sort: "created",
          direction: "desc"
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    const entries = [];
    for (const comment of raw) {
      const parsed = isRecord4(comment) ? buildCommentEntry("IssueComment", comment) : null;
      if (parsed) entries.push(parsed);
    }
    return entries;
  } catch (error) {
    context.logger.debug({ err: error, nodeId: node.id }, "Failed to fetch issue comments for conversation context");
    return [];
  }
}
async function fetchPullComments(context, node, maxComments) {
  if (node.number === void 0 || maxComments <= 0) return [];
  const perPage = Math.min(100, Math.max(1, maxComments));
  const entries = [];
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.issues.listComments({
          owner: node.owner,
          repo: node.repo,
          issue_number: node.number,
          per_page: pageSize,
          page,
          sort: "created",
          direction: "desc"
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    for (const comment of raw) {
      const parsed = isRecord4(comment) ? buildCommentEntry("IssueComment", comment) : null;
      if (parsed) entries.push(parsed);
    }
  } catch (error) {
    context.logger.debug({ err: error, nodeId: node.id }, "Failed to fetch PR issue comments for conversation context");
  }
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.pulls.listReviewComments({
          owner: node.owner,
          repo: node.repo,
          pull_number: node.number,
          per_page: pageSize,
          page,
          sort: "created",
          direction: "desc"
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    for (const comment of raw) {
      const parsed = isRecord4(comment) ? buildCommentEntry("ReviewComment", comment) : null;
      if (parsed) entries.push(parsed);
    }
  } catch (error) {
    context.logger.debug({ err: error, nodeId: node.id }, "Failed to fetch PR review comments for conversation context");
  }
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.pulls.listReviews({
          owner: node.owner,
          repo: node.repo,
          pull_number: node.number,
          per_page: pageSize,
          page
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    for (const review of raw) {
      const parsed = isRecord4(review) ? buildCommentEntry("Review", review) : null;
      if (parsed) entries.push(parsed);
    }
  } catch (error) {
    context.logger.debug({ err: error, nodeId: node.id }, "Failed to fetch PR reviews for conversation context");
  }
  return entries;
}
async function fetchCommentsForNode(context, node, maxComments) {
  if (maxComments <= 0) return [];
  const raw = node.type === "PullRequest" ? await fetchPullComments(context, node, maxComments) : await fetchIssueComments2(context, node, maxComments);
  const deduped = dedupeComments(raw);
  const sorted = sortCommentsByDate(deduped);
  return sorted.slice(0, maxComments);
}
async function fetchCommentsForNodes(context, nodes, maxComments) {
  const map = /* @__PURE__ */ new Map();
  const entries = await mapWithConcurrency(nodes, DEFAULT_GITHUB_CONCURRENCY, async (node) => {
    const comments = await fetchCommentsForNode(context, node, maxComments);
    return { id: node.id, comments };
  });
  for (const entry of entries) {
    map.set(entry.id, entry.comments);
  }
  return map;
}
async function fetchNodeBodyMarkdown(context, node) {
  if (node.number === void 0) return "";
  try {
    if (node.type === "PullRequest") {
      const { data: data2 } = await context.octokit.rest.pulls.get({
        owner: node.owner,
        repo: node.repo,
        pull_number: node.number
      });
      return typeof data2.body === "string" ? data2.body : "";
    }
    const { data } = await context.octokit.rest.issues.get({
      owner: node.owner,
      repo: node.repo,
      issue_number: node.number
    });
    return typeof data.body === "string" ? data.body : "";
  } catch (error) {
    context.logger.debug({ err: error, nodeId: node.id }, "Failed to fetch node body for conversation context");
    return "";
  }
}
function buildNodeFromDocument(doc) {
  const payload = isRecord4(doc.payload) ? doc.payload : null;
  if (!payload) return null;
  const repository = isRecord4(payload.repository) ? payload.repository : null;
  const owner = isRecord4(repository?.owner) ? String(repository.owner.login || "").trim() : "";
  const repo = typeof repository?.name === "string" ? repository.name : "";
  const issue = isRecord4(payload.issue) ? payload.issue : null;
  const pullRequest = isRecord4(payload.pull_request) ? payload.pull_request : null;
  const isIssue = doc.docType === "issue";
  const source = isIssue ? issue : pullRequest;
  if (!source) return null;
  const createdAt = typeof source.created_at === "string" ? source.created_at : "";
  let url = "";
  if (typeof source.html_url === "string") {
    url = source.html_url;
  } else if (typeof source.url === "string") {
    url = source.url;
  }
  const number = typeof source.number === "number" ? source.number : void 0;
  const title = typeof source.title === "string" ? source.title : void 0;
  const type = isIssue ? "Issue" : "PullRequest";
  if (!createdAt || !url || !owner || !repo) return null;
  return {
    id: doc.id,
    type,
    createdAt,
    url,
    owner,
    repo,
    number,
    title
  };
}
function buildDescriptorFromDocument(doc) {
  const payload = isRecord4(doc.payload) ? doc.payload : null;
  if (!payload) return null;
  const repository = isRecord4(payload.repository) ? payload.repository : null;
  const owner = isRecord4(repository?.owner) ? String(repository.owner.login || "").trim() : "";
  const repo = typeof repository?.name === "string" ? repository.name : "";
  if (!owner || !repo) return null;
  if (doc.docType === "issue" || doc.docType === "pull_request") {
    const node = buildNodeFromDocument(doc);
    if (!node) return null;
    return {
      id: doc.id,
      kind: node.type === "Issue" ? "Issue" : "PullRequest",
      owner: node.owner,
      repo: node.repo,
      number: node.number,
      title: node.title,
      url: node.url,
      createdAt: node.createdAt
    };
  }
  if (!COMMENT_DOC_TYPES.includes(doc.docType)) return null;
  const comment = isRecord4(payload.comment) ? payload.comment : null;
  const review = isRecord4(payload.review) ? payload.review : null;
  const source = comment ?? review;
  if (!isRecord4(source)) return null;
  const createdAt = typeof source.created_at === "string" ? source.created_at : "";
  const submittedAt = typeof source.submitted_at === "string" ? source.submitted_at : "";
  const timestamp = createdAt || submittedAt;
  let url = "";
  if (typeof source.html_url === "string") {
    url = source.html_url;
  } else if (typeof source.url === "string") {
    url = source.url;
  }
  const user = isRecord4(source.user) ? source.user : null;
  const author = typeof user?.login === "string" ? user.login.trim() : "";
  const issue = isRecord4(payload.issue) ? payload.issue : null;
  const pullRequest = isRecord4(payload.pull_request) ? payload.pull_request : null;
  let number;
  if (typeof issue?.number === "number") {
    number = issue.number;
  } else if (typeof pullRequest?.number === "number") {
    number = pullRequest.number;
  }
  if (!url || !timestamp) return null;
  let kind = "PullRequestReview";
  if (doc.docType === "issue_comment") {
    kind = "IssueComment";
  } else if (doc.docType === "review_comment") {
    kind = "ReviewComment";
  }
  return {
    id: doc.id,
    kind,
    owner,
    repo,
    number,
    url,
    author: author || void 0,
    createdAt: timestamp
  };
}
function formatDescriptorLine(descriptor, options = {}) {
  let typeLabel = "Review";
  if (descriptor.kind === "Issue") {
    typeLabel = "Issue";
  } else if (descriptor.kind === "PullRequest") {
    typeLabel = "PR";
  } else if (descriptor.kind === "IssueComment") {
    typeLabel = "Issue Comment";
  } else if (descriptor.kind === "ReviewComment") {
    typeLabel = "Review Comment";
  }
  const repoLabel = descriptor.owner && descriptor.repo ? `${descriptor.owner}/${descriptor.repo}` : "unknown";
  const numberLabel = typeof descriptor.number === "number" ? `#${descriptor.number}` : "";
  const title = descriptor.title ? ` - ${descriptor.title}` : "";
  const author = descriptor.author ? ` @${descriptor.author}` : "";
  const score = typeof options.similarity === "number" ? ` (sim ${options.similarity.toFixed(2)})` : "";
  return `- [${typeLabel}] ${repoLabel}${numberLabel}${title}${author}${score}`;
}
function formatSeedLabel(doc) {
  const descriptor = buildDescriptorFromDocument(doc);
  if (!descriptor) return doc.id;
  return formatDescriptorLine(descriptor).replace(/^- /, "");
}
function formatMatchedBy(labels) {
  if (labels.length === 0) return "";
  const trimmed = labels.slice(0, 3);
  const extra = labels.length - trimmed.length;
  const suffix = extra > 0 ? ` +${extra} more` : "";
  return `${trimmed.join("; ")}${suffix}`;
}
function getDocumentTimestamp(doc) {
  const payload = isRecord4(doc.payload) ? doc.payload : null;
  if (!payload) return null;
  const issue = isRecord4(payload.issue) ? payload.issue : null;
  const pullRequest = isRecord4(payload.pull_request) ? payload.pull_request : null;
  const comment = isRecord4(payload.comment) ? payload.comment : null;
  const review = isRecord4(payload.review) ? payload.review : null;
  let source = null;
  if (doc.docType === "issue") {
    source = issue;
  } else if (doc.docType === "pull_request") {
    source = pullRequest;
  } else if (COMMENT_DOC_TYPES.includes(doc.docType)) {
    source = comment ?? review;
  }
  if (!source) return null;
  const updatedAt = typeof source.updated_at === "string" ? source.updated_at : "";
  const createdAt = typeof source.created_at === "string" ? source.created_at : "";
  const submittedAt = typeof source.submitted_at === "string" ? source.submitted_at : "";
  const parsed = Date.parse(updatedAt || submittedAt || createdAt);
  return Number.isFinite(parsed) ? parsed : null;
}
async function findSimilarForDocument(config, doc) {
  if (!config) return [];
  const embedding = Array.isArray(doc.embedding) ? doc.embedding : [];
  if (embedding.length === 0) return [];
  const [issueResults, commentResults] = await Promise.all([
    findSimilarIssues(config, {
      currentId: doc.id,
      embedding,
      threshold: DEFAULT_SIMILARITY_THRESHOLD,
      topK: DEFAULT_SIMILARITY_TOP_K
    }),
    findSimilarComments(config, {
      currentId: doc.id,
      embedding,
      threshold: DEFAULT_SIMILARITY_THRESHOLD,
      topK: DEFAULT_SIMILARITY_TOP_K
    })
  ]);
  const combined = [...issueResults, ...commentResults];
  combined.sort((a, b) => b.similarity - a.similarity);
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const item of combined) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= DEFAULT_SIMILARITY_TOP_K) break;
  }
  return deduped;
}
function buildCandidateComments(comments, maxComments, maxChars) {
  const entries = [];
  for (const comment of comments.slice(0, maxComments)) {
    const body = clampText2(normalizeMarkdown(comment.body), maxChars);
    if (!body) continue;
    entries.push({
      author: comment.author || "unknown",
      date: formatDateLabel(comment.createdAt),
      body
    });
  }
  return entries;
}
function buildSelectorCandidateFromNode(node, body, comments, source) {
  return {
    id: node.id,
    kind: node.type,
    source,
    owner: node.owner,
    repo: node.repo,
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    body: clampText2(body, DEFAULT_SELECTOR_MAX_BODY_CHARS),
    comments: buildCandidateComments(comments, DEFAULT_SELECTOR_MAX_COMMENTS, DEFAULT_SELECTOR_MAX_COMMENT_CHARS)
  };
}
function buildSelectorCandidateFromSemantic(entry) {
  const { descriptor, doc } = entry;
  if (!descriptor.url) return null;
  return {
    id: doc.id,
    kind: descriptor.kind,
    source: "semantic",
    owner: descriptor.owner,
    repo: descriptor.repo,
    number: descriptor.number,
    title: descriptor.title,
    url: descriptor.url,
    createdAt: descriptor.createdAt,
    body: clampText2(normalizeMarkdown(doc.markdown ?? ""), DEFAULT_SELECTOR_MAX_BODY_CHARS),
    comments: []
  };
}
async function selectConversationCandidates(params) {
  const query = params.query.trim();
  if (!query) return null;
  if (params.candidates.length === 0) return /* @__PURE__ */ new Set([params.root.id]);
  return null;
}
async function buildConversationContext(params) {
  const maxItems = typeof params.maxItems === "number" && Number.isFinite(params.maxItems) ? Math.max(1, Math.trunc(params.maxItems)) : DEFAULT_MAX_ITEMS;
  const maxChars = typeof params.maxChars === "number" && Number.isFinite(params.maxChars) ? Math.max(200, Math.trunc(params.maxChars)) : DEFAULT_MAX_CHARS;
  const shouldIncludeSemantic = params.shouldIncludeSemantic !== false;
  const maxComments = typeof params.maxComments === "number" && Number.isFinite(params.maxComments) ? Math.max(0, Math.trunc(params.maxComments)) : DEFAULT_MAX_COMMENTS;
  const maxCommentChars = typeof params.maxCommentChars === "number" && Number.isFinite(params.maxCommentChars) ? Math.max(40, Math.trunc(params.maxCommentChars)) : DEFAULT_MAX_COMMENT_CHARS;
  const shouldIncludeComments = params.shouldIncludeComments !== false && maxComments > 0;
  const keyNodes = await listConversationNodesForKey(params.context, params.conversation.key, maxItems * 2, params.context.logger);
  const explicitNodes = dedupeNodes2([...params.conversation.linked, ...keyNodes]).filter((node) => node.id !== params.conversation.root.id);
  const threadNodes = [params.conversation.root, ...explicitNodes];
  const commentMap = shouldIncludeComments ? await fetchCommentsForNodes(params.context, threadNodes, maxComments) : /* @__PURE__ */ new Map();
  const config = shouldIncludeSemantic ? getVectorDbConfig2(params.context.logger) : null;
  const docMap = /* @__PURE__ */ new Map();
  const graphDocIds = /* @__PURE__ */ new Set([params.conversation.root.id]);
  const seedParentMap = /* @__PURE__ */ new Map();
  const semanticByParent = /* @__PURE__ */ new Map();
  if (config) {
    const explicitDocs = await fetchVectorDocuments(
      config,
      explicitNodes.map((node) => node.id),
      { includeEmbedding: true }
    );
    for (const doc of explicitDocs) {
      docMap.set(doc.id, doc);
      graphDocIds.add(doc.id);
      seedParentMap.set(doc.id, doc.id);
    }
  }
  if (config) {
    const seedDocs = [];
    const rootDoc = await fetchVectorDocument(config, params.conversation.root.id);
    if (rootDoc) {
      docMap.set(rootDoc.id, rootDoc);
      graphDocIds.add(rootDoc.id);
      seedParentMap.set(rootDoc.id, params.conversation.root.id);
      if (rootDoc.embedding && rootDoc.embedding.length > 0) {
        seedDocs.push(rootDoc);
      }
    }
    for (const doc of docMap.values()) {
      if (doc.embedding && doc.embedding.length > 0) {
        seedDocs.push(doc);
      }
    }
    const commentSeedLimit = Math.max(DEFAULT_MAX_COMMENTS, maxComments);
    const commentDocsByNode = await mapWithConcurrency(threadNodes, DEFAULT_VECTOR_CONCURRENCY, async (node) => {
      const comments = await fetchVectorDocumentsByParentId(config, node.id, {
        includeEmbedding: true,
        maxPerParent: commentSeedLimit,
        docTypes: COMMENT_DOC_TYPES
      });
      return { nodeId: node.id, comments };
    });
    for (const entry of commentDocsByNode) {
      for (const doc of entry.comments) {
        docMap.set(doc.id, doc);
        graphDocIds.add(doc.id);
        seedParentMap.set(doc.id, entry.nodeId);
        if (doc.embedding && doc.embedding.length > 0) {
          seedDocs.push(doc);
        }
      }
    }
    const seedMap = /* @__PURE__ */ new Map();
    for (const doc of seedDocs) {
      if (!seedMap.has(doc.id)) seedMap.set(doc.id, doc);
    }
    const similarityById = /* @__PURE__ */ new Map();
    const seedDocsList = [...seedMap.values()];
    const similarityResults = await mapWithConcurrency(seedDocsList, DEFAULT_VECTOR_CONCURRENCY, async (doc) => {
      const matches = await findSimilarForDocument(config, doc);
      return { docId: doc.id, matches };
    });
    for (const result of similarityResults) {
      for (const match of result.matches) {
        if (graphDocIds.has(match.id)) continue;
        const existing = similarityById.get(match.id);
        if (existing) {
          existing.sources.add(result.docId);
          if (match.similarity > existing.similarity) existing.similarity = match.similarity;
        } else {
          similarityById.set(match.id, { similarity: match.similarity, sources: /* @__PURE__ */ new Set([result.docId]) });
        }
      }
    }
    const candidateIds = [...similarityById.keys()];
    if (candidateIds.length > 0) {
      const candidateDocs = await fetchVectorDocuments(config, candidateIds);
      for (const doc of candidateDocs) {
        docMap.set(doc.id, doc);
      }
      const candidates = candidateDocs.map((doc) => {
        const descriptor = buildDescriptorFromDocument(doc);
        const meta = similarityById.get(doc.id);
        if (!descriptor || !meta) return null;
        const timestampMs = getDocumentTimestamp(doc);
        return { descriptor, doc, similarity: meta.similarity, sources: meta.sources, timestampMs };
      }).filter(
        (row) => Boolean(row)
      );
      const participants = collectParticipantIds(params.context);
      const repoOwner = getRepositoryOwner(params.context);
      const timeValues = candidates.map((row) => row.timestampMs).filter((value) => typeof value === "number");
      const minTime = timeValues.length ? Math.min(...timeValues) : null;
      const maxTime = timeValues.length ? Math.max(...timeValues) : null;
      const timeRange = minTime !== null && maxTime !== null ? maxTime - minTime : 0;
      candidates.sort((a, b) => {
        const authorBoostA = a.doc.authorId !== null && participants.has(a.doc.authorId) ? DEFAULT_AUTHOR_BOOST : 0;
        const authorBoostB = b.doc.authorId !== null && participants.has(b.doc.authorId) ? DEFAULT_AUTHOR_BOOST : 0;
        const ownerBoostA = repoOwner && a.descriptor.owner.toLowerCase() === repoOwner ? DEFAULT_OWNER_BOOST : 0;
        const ownerBoostB = repoOwner && b.descriptor.owner.toLowerCase() === repoOwner ? DEFAULT_OWNER_BOOST : 0;
        const recencyA = timeRange > 0 && typeof a.timestampMs === "number" && minTime !== null ? (a.timestampMs - minTime) / timeRange : 1;
        const recencyB = timeRange > 0 && typeof b.timestampMs === "number" && minTime !== null ? (b.timestampMs - minTime) / timeRange : 1;
        const recencyBoostA = timeRange > 0 ? recencyA * DEFAULT_RECENCY_BOOST : 0;
        const recencyBoostB = timeRange > 0 ? recencyB * DEFAULT_RECENCY_BOOST : 0;
        const scoreA = a.similarity + authorBoostA + ownerBoostA + recencyBoostA;
        const scoreB = b.similarity + authorBoostB + ownerBoostB + recencyBoostB;
        return scoreB - scoreA;
      });
      const seenByParent = /* @__PURE__ */ new Map();
      for (const row of candidates) {
        const meta = similarityById.get(row.doc.id);
        if (!meta) continue;
        const sourceLabels = [...meta.sources].map((id) => seedMap.get(id)).filter((seed) => Boolean(seed)).map((seed) => formatSeedLabel(seed));
        const matchedBy = formatMatchedBy(sourceLabels);
        const entry = { doc: row.doc, descriptor: row.descriptor, similarity: row.similarity, matchedBy };
        const parentIds = /* @__PURE__ */ new Set();
        for (const sourceId of meta.sources) {
          const parentId = seedParentMap.get(sourceId);
          if (parentId) parentIds.add(parentId);
        }
        for (const parentId of parentIds) {
          const seen = seenByParent.get(parentId) ?? /* @__PURE__ */ new Set();
          if (seen.has(row.doc.id)) continue;
          seen.add(row.doc.id);
          seenByParent.set(parentId, seen);
          const list = semanticByParent.get(parentId) ?? [];
          list.push(entry);
          semanticByParent.set(parentId, list);
        }
      }
    }
  }
  const nodeBodyMap = /* @__PURE__ */ new Map();
  const bodyEntries = await mapWithConcurrency(threadNodes, DEFAULT_GITHUB_CONCURRENCY, async (node) => {
    const existing = normalizeMarkdown(docMap.get(node.id)?.markdown ?? null);
    if (existing) {
      return { id: node.id, body: existing };
    }
    const fetched = normalizeMarkdown(await fetchNodeBodyMarkdown(params.context, node));
    return { id: node.id, body: fetched };
  });
  for (const entry of bodyEntries) {
    nodeBodyMap.set(entry.id, entry.body);
  }
  const query = typeof params.query === "string" ? params.query.trim() : "";
  const shouldUseSelector = Boolean(query) && params.shouldUseSelector !== false;
  let selectionIds = null;
  if (shouldUseSelector) {
    const rootComments2 = commentMap.get(params.conversation.root.id) ?? [];
    const rootCandidate = buildSelectorCandidateFromNode(params.conversation.root, nodeBodyMap.get(params.conversation.root.id) ?? "", rootComments2, "graph");
    const candidateById = /* @__PURE__ */ new Map();
    for (const node of threadNodes) {
      if (node.id === params.conversation.root.id) continue;
      const candidate = buildSelectorCandidateFromNode(node, nodeBodyMap.get(node.id) ?? "", commentMap.get(node.id) ?? [], "graph");
      candidateById.set(candidate.id, candidate);
    }
    for (const entries of semanticByParent.values()) {
      for (const entry of entries) {
        const candidate = buildSelectorCandidateFromSemantic(entry);
        if (!candidate || candidate.id === params.conversation.root.id) continue;
        if (!candidateById.has(candidate.id)) candidateById.set(candidate.id, candidate);
      }
    }
    selectionIds = await selectConversationCandidates({
      context: params.context,
      query,
      root: rootCandidate,
      candidates: [...candidateById.values()],
      maxSelections: maxItems
    });
  }
  let filteredExplicitNodes = explicitNodes;
  let filteredSemanticByParent = semanticByParent;
  if (selectionIds && selectionIds.size > 0) {
    filteredSemanticByParent = /* @__PURE__ */ new Map();
    for (const [parentId, entries] of semanticByParent.entries()) {
      const filtered = entries.filter((entry) => selectionIds?.has(entry.doc.id));
      if (filtered.length > 0) filteredSemanticByParent.set(parentId, filtered);
    }
    filteredExplicitNodes = explicitNodes.filter((node) => selectionIds?.has(node.id) || filteredSemanticByParent.has(node.id));
  }
  const lines = [];
  const rootMarkdown = nodeBodyMap.get(params.conversation.root.id) ?? "";
  const rootComments = commentMap.get(params.conversation.root.id) ?? [];
  const rootSemantic = filteredSemanticByParent.get(params.conversation.root.id) ?? [];
  const hasRootContent = Boolean(rootMarkdown) || rootComments.length > 0 || rootSemantic.length > 0;
  if (hasRootContent) {
    lines.push("Current thread:");
    lines.push(formatNodeLine(params.conversation.root));
    if (params.conversation.root.url) lines.push(`  ${params.conversation.root.url}`);
    if (rootMarkdown) lines.push(indentBlock(rootMarkdown, "  "));
    if (rootComments.length > 0) {
      lines.push("  Comments:");
      for (const comment of rootComments) {
        lines.push(`  ${formatCommentLine(comment)}`);
        if (comment.url) lines.push(`    ${comment.url}`);
        const body = clampText2(normalizeMarkdown(comment.body), maxCommentChars);
        if (body) lines.push(indentBlock(body, "    "));
      }
    }
    if (rootSemantic.length > 0) {
      lines.push("  Similar (semantic):");
      const entries = [...rootSemantic].sort((a, b) => b.similarity - a.similarity).slice(0, DEFAULT_SIMILARITY_TOP_K);
      for (const entry of entries) {
        lines.push(`  ${formatDescriptorLine(entry.descriptor, { similarity: entry.similarity })}`);
        if (entry.descriptor.url) lines.push(`    ${entry.descriptor.url}`);
        if (entry.matchedBy) lines.push(`    matched by: ${entry.matchedBy}`);
        const markdown = normalizeMarkdown(entry.doc.markdown);
        if (markdown) lines.push(indentBlock(markdown, "    "));
      }
    }
  }
  if (filteredExplicitNodes.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Conversation links (auto-merged):");
    for (const node of filteredExplicitNodes.slice(0, maxItems)) {
      lines.push(formatNodeLine(node));
      if (node.url) lines.push(`  ${node.url}`);
      const markdown = nodeBodyMap.get(node.id) ?? "";
      if (markdown) lines.push(indentBlock(markdown, "  "));
      const comments = commentMap.get(node.id) ?? [];
      if (comments.length > 0) {
        lines.push("  Comments:");
        for (const comment of comments) {
          lines.push(`  ${formatCommentLine(comment)}`);
          if (comment.url) lines.push(`    ${comment.url}`);
          const body = clampText2(normalizeMarkdown(comment.body), maxCommentChars);
          if (body) lines.push(indentBlock(body, "    "));
        }
      }
      const semantic = filteredSemanticByParent.get(node.id) ?? [];
      if (semantic.length > 0) {
        lines.push("  Similar (semantic):");
        const entries = [...semantic].sort((a, b) => b.similarity - a.similarity).slice(0, DEFAULT_SIMILARITY_TOP_K);
        for (const entry of entries) {
          lines.push(`  ${formatDescriptorLine(entry.descriptor, { similarity: entry.similarity })}`);
          if (entry.descriptor.url) lines.push(`    ${entry.descriptor.url}`);
          if (entry.matchedBy) lines.push(`    matched by: ${entry.matchedBy}`);
          const entryMarkdown = normalizeMarkdown(entry.doc.markdown);
          if (entryMarkdown) lines.push(indentBlock(entryMarkdown, "    "));
        }
      }
    }
  }
  if (lines.length === 0) return "";
  return clampText2(lines.join("\n"), maxChars);
}
var DEFAULT_MAX_ITEMS, DEFAULT_MAX_CHARS, DEFAULT_MAX_COMMENTS, DEFAULT_MAX_COMMENT_CHARS, DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_SIMILARITY_TOP_K, DEFAULT_AUTHOR_BOOST, DEFAULT_OWNER_BOOST, DEFAULT_RECENCY_BOOST, DEFAULT_SELECTOR_MAX_BODY_CHARS, DEFAULT_SELECTOR_MAX_COMMENT_CHARS, DEFAULT_SELECTOR_MAX_COMMENTS, DEFAULT_GITHUB_CONCURRENCY, DEFAULT_VECTOR_CONCURRENCY, COMMENT_DOC_TYPES;
var init_conversation_context = __esm({
  "src/handlers/codex-agent/lib/conversation-context.ts"() {
    "use strict";
    init_esm_shims();
    init_conversation_graph();
    init_vector_db();
    DEFAULT_MAX_ITEMS = 10;
    DEFAULT_MAX_CHARS = 4e3;
    DEFAULT_MAX_COMMENTS = 8;
    DEFAULT_MAX_COMMENT_CHARS = 256;
    DEFAULT_SIMILARITY_THRESHOLD = 0.8;
    DEFAULT_SIMILARITY_TOP_K = 5;
    DEFAULT_AUTHOR_BOOST = 0.07;
    DEFAULT_OWNER_BOOST = 0.04;
    DEFAULT_RECENCY_BOOST = 0.06;
    DEFAULT_SELECTOR_MAX_BODY_CHARS = 900;
    DEFAULT_SELECTOR_MAX_COMMENT_CHARS = 280;
    DEFAULT_SELECTOR_MAX_COMMENTS = 6;
    DEFAULT_GITHUB_CONCURRENCY = 4;
    DEFAULT_VECTOR_CONCURRENCY = 6;
    COMMENT_DOC_TYPES = ["issue_comment", "review_comment", "pull_request_review"];
  }
});

// src/handlers/codex-agent/lib/agent-dispatch.ts
import { brotliCompressSync } from "zlib";
import { randomUUID } from "crypto";
function normalizeEnvironmentName(environment) {
  return String(environment ?? "").trim().toLowerCase();
}
function getConfigFullPathForEnvironment(environment) {
  const normalized = normalizeEnvironmentName(environment);
  if (!normalized) {
    return DEV_CONFIG_FULL_PATH;
  }
  if (normalized === "production" || normalized === "prod") {
    return CONFIG_FULL_PATH;
  }
  const suffix = ENVIRONMENT_TO_CONFIG_SUFFIX[normalized] ?? normalized;
  if (suffix === "dev") {
    return DEV_CONFIG_FULL_PATH;
  }
  if (!VALID_CONFIG_SUFFIX.test(suffix)) {
    return DEV_CONFIG_FULL_PATH;
  }
  return `.github/.ubiquity-os.config.${suffix}.yml`;
}
function getConfigPathCandidatesForEnvironment(environment) {
  const primary = getConfigFullPathForEnvironment(environment);
  return primary === CONFIG_FULL_PATH ? [CONFIG_FULL_PATH] : [primary, CONFIG_FULL_PATH];
}
function compressString(value) {
  const data = Buffer.from(value, "utf8");
  return Buffer.from(brotliCompressSync(data)).toString("base64");
}
function resolveAgentTarget(env) {
  const owner = String(env.UOS_AGENT_OWNER || process.env.UOS_AGENT_OWNER || "ubiquity-os").trim();
  const repo = String(env.UOS_AGENT_REPO || process.env.UOS_AGENT_REPO || "ubiquity-os-kernel").trim();
  const workflowId = String(env.UOS_AGENT_WORKFLOW || process.env.UOS_AGENT_WORKFLOW || "agent.yml").trim();
  const ref = String(env.UOS_AGENT_REF || process.env.UOS_AGENT_REF || "").trim();
  if (!owner || !repo || !workflowId) {
    throw new Error("Missing agent workflow target (UOS_AGENT_OWNER/UOS_AGENT_REPO/UOS_AGENT_WORKFLOW).");
  }
  return { owner, repo, workflowId, ref: ref || void 0 };
}
async function getDefaultBranch(octokit, owner, repo) {
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data.default_branch;
}
function buildAgentSettings(context, overrides) {
  const environment = String(context.env.ENVIRONMENT || process.env.ENVIRONMENT || "").trim();
  const settings = {};
  if (environment) {
    settings.environment = environment;
  }
  const candidates = getConfigPathCandidatesForEnvironment(environment);
  if (candidates.length) {
    settings.configPathCandidates = candidates;
  }
  return { ...settings, ...overrides ?? {} };
}
async function dispatchAgentWorkflow(args) {
  const { context, task, logger, settingsOverrides } = args;
  const { token: authToken, source: tokenSource } = requirePatToken({ purpose: "agent dispatch" });
  const octokit = new customOctokit({ auth: authToken });
  const target = resolveAgentTarget(context.env);
  const ref = target.ref || await getDefaultBranch(octokit, target.owner, target.repo);
  const stateId = randomUUID();
  const settings = buildAgentSettings(context, settingsOverrides);
  const eventPayload = compressString(safeStringify(context.payload ?? {}));
  const command = JSON.stringify({ name: "agent", parameters: { task } });
  const inputs = {
    stateId,
    eventName: context.eventName,
    eventPayload,
    settings: JSON.stringify(settings),
    authToken,
    ubiquityKernelToken: String(context.ubiquityKernelToken || ""),
    ref,
    command,
    signature: ""
  };
  logger.info("[agent] Dispatching workflow", { owner: target.owner, repo: target.repo, workflow: target.workflowId, ref, tokenSource });
  await octokit.rest.actions.createWorkflowDispatch({
    owner: target.owner,
    repo: target.repo,
    workflow_id: target.workflowId,
    ref,
    inputs
  });
  return { target, ref, inputs };
}
var CONFIG_FULL_PATH, DEV_CONFIG_FULL_PATH, ENVIRONMENT_TO_CONFIG_SUFFIX, VALID_CONFIG_SUFFIX;
var init_agent_dispatch = __esm({
  "src/handlers/codex-agent/lib/agent-dispatch.ts"() {
    "use strict";
    init_esm_shims();
    init_octokit();
    init_config();
    init_utils();
    CONFIG_FULL_PATH = ".github/.ubiquity-os.config.yml";
    DEV_CONFIG_FULL_PATH = ".github/.ubiquity-os.config.dev.yml";
    ENVIRONMENT_TO_CONFIG_SUFFIX = {
      development: "dev"
    };
    VALID_CONFIG_SUFFIX = /^[a-z0-9][a-z0-9_-]*$/i;
  }
});

// src/handlers/codex-agent/lib/logs.ts
import fs from "fs";
import path2 from "path";
function writeRuntimeLogs(params) {
  const dir = path2.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const runId = process.env.GITHUB_RUN_ID || String(Date.now());
  const promptPath = path2.join(dir, `prompt-${runId}.txt`);
  const bodyPath = path2.join(dir, `agent-request-${runId}.json`);
  const payloadPath = path2.join(dir, `event-${runId}.json`);
  const payloadSanitizedPath = path2.join(dir, `event-sanitized-${runId}.json`);
  fs.writeFileSync(promptPath, params.task, "utf8");
  fs.writeFileSync(bodyPath, JSON.stringify(params.inputs, null, 2), "utf8");
  if (process.env.WRITE_EVENT_FILE === "1") {
    try {
      fs.writeFileSync(payloadPath, JSON.stringify(params.payload, null, 2), "utf8");
      if (params.sanitized !== void 0) {
        fs.writeFileSync(payloadSanitizedPath, JSON.stringify(params.sanitized, null, 2), "utf8");
      }
    } catch {
    }
  }
}
function logPayloadIfEnabled(args) {
  const { logger, payload, task, inputs } = args;
  if (process.env.LOG_PROMPT === "1") {
    const rawLen = safeStringify(payload).length;
    const inputsLen = safeStringify(inputs).length;
    logger.info("[codexAgent] Task (full)", { length: task.length, task, eventLen: rawLen, inputsLen });
  }
}
async function maybeWriteRuntimeLogs(args) {
  const { task, inputs, payload, logger } = args;
  if (process.env.WRITE_PROMPT_FILE !== "1") return;
  try {
    writeRuntimeLogs({ task, inputs, payload, sanitized: process.env.PROMPT_INCLUDE_EVENT === "1" ? stripUrlFields(payload) : void 0 });
  } catch (e) {
    logger.info("[codexAgent] runtime log write failed (non-fatal)", { error: String(e) });
  }
}
var init_logs = __esm({
  "src/handlers/codex-agent/lib/logs.ts"() {
    "use strict";
    init_esm_shims();
    init_utils();
  }
});

// src/handlers/codex-agent/index.ts
function formatDispatchError(error) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const err = error;
  return {
    message: typeof err.message === "string" ? err.message : String(error),
    status: typeof err.status === "number" ? err.status : void 0,
    name: typeof err.name === "string" ? err.name : void 0,
    url: typeof err.request?.url === "string" ? err.request.url : void 0,
    documentationUrl: typeof err.documentation_url === "string" ? err.documentation_url : void 0
  };
}
async function codexAgent(context) {
  const { logger, payload, env } = context;
  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPr = Boolean(payload.issue?.pull_request);
  const owner = payload.repository.owner.login;
  const body = String(payload.comment.body || "");
  const agentOwner = env.AGENT_OWNER;
  if (!agentOwner) {
    logger.error("Missing AGENT_OWNER env");
    return;
  }
  const isSelf = Boolean(sender && agentOwner && String(sender).toLowerCase() === String(agentOwner).toLowerCase());
  const accessLevel = isSelf ? "full" : "read-only";
  logger.info("Executing codexAgent", { sender, repo, issueNumber, owner, agentOwner, accessLevel });
  const trimmed = body.trim();
  const mention = `@${agentOwner}`;
  if (!trimmed.toLowerCase().startsWith(mention.toLowerCase())) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }
  const command = trimmed.slice(mention.length).replace(/^[:,]?\s+/, "").trim();
  if (!command) {
    await context.commentHandler.postComment(context, logger.error("No command provided after username mention"));
    return;
  }
  const isMinimalEnv = process.env.PROMPT_MINIMAL === "1" || process.env.UOS_PROMPT_MINIMAL === "1" || process.env.PI_MINIMAL === "1";
  const styleExamples = isMinimalEnv ? [] : await maybeFetchStyleExamples({ login: agentOwner, owner, repo, logger });
  const richPrompt = buildRichPrompt({
    accessLevel,
    isPr,
    owner,
    repo,
    issueNumber,
    sender,
    agentOwner,
    command,
    styleExamples
  });
  const isMinimal = isMinimalEnv;
  let task = isMinimal ? command : richPrompt;
  const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!isMinimal && promptMaxLen > 0 && task.length > promptMaxLen) {
    logger.info("[codexAgent] Task exceeds PROMPT_MAX_LEN, falling back to minimal", { len: task.length, max: promptMaxLen });
    task = command;
  }
  let conversationContext = "";
  let conversationKey = "";
  let agentMemory = "";
  try {
    const conversation = await resolveConversationKeyForContext(context, logger);
    if (conversation) {
      conversationKey = conversation.key;
      conversationContext = await buildConversationContext({
        context,
        conversation,
        maxItems: 8,
        maxChars: 3200,
        query: command,
        shouldUseSelector: false
      });
    }
    agentMemory = await getAgentMemorySnippet({ owner, repo, scopeKey: conversationKey || void 0, logger });
  } catch (error) {
    logger.info("[codexAgent] Conversation context build failed (non-fatal)", { error: String(error) });
  }
  try {
    const shouldDispatch = String(process.env.UOS_AGENT_DISPATCH ?? env.UOS_AGENT_DISPATCH ?? "1").trim() !== "0";
    if (!shouldDispatch) {
      logPayloadIfEnabled({ logger, payload, task, inputs: {} });
      logger.info("[agent] Dispatch disabled via UOS_AGENT_DISPATCH=0.");
      return;
    }
    const { inputs } = await dispatchAgentWorkflow({
      context,
      task,
      logger,
      settingsOverrides: {
        ...agentMemory ? { agentMemory } : {},
        ...conversationContext ? { conversationContext } : {},
        ...conversationKey ? { conversationKey } : {}
      }
    });
    logPayloadIfEnabled({ logger, payload, task, inputs });
    await maybeWriteRuntimeLogs({ task, inputs, payload, logger });
    logger.ok("Agent workflow dispatch complete.");
  } catch (error) {
    logger.error("Agent dispatch error", formatDispatchError(error));
    throw error;
  }
}
var init_codex_agent = __esm({
  "src/handlers/codex-agent/index.ts"() {
    "use strict";
    init_esm_shims();
    init_prompt();
    init_github();
    init_agent_memory();
    init_conversation_context();
    init_conversation_graph();
    init_agent_dispatch();
    init_logs();
  }
});

// src/handlers/codex-agent.ts
var codex_agent_exports = {};
__export(codex_agent_exports, {
  codexAgent: () => codexAgent
});
var init_codex_agent2 = __esm({
  "src/handlers/codex-agent.ts"() {
    "use strict";
    init_esm_shims();
    init_codex_agent();
  }
});

// src/index.ts
init_esm_shims();

// src/types/typeguards.ts
init_esm_shims();
function isIssueCommentEvent(context) {
  return context.eventName === "issue_comment.created";
}

// src/index.ts
init_octokit();
init_config();
import fs2 from "fs";
import { brotliDecompressSync } from "zlib";
var cachedCodexAgent;
async function loadCodexAgent() {
  if (!cachedCodexAgent) {
    cachedCodexAgent = Promise.resolve().then(() => (init_codex_agent2(), codex_agent_exports)).then((mod) => mod.codexAgent).catch(async (error) => {
      if (!isModuleNotFound(error) || !import.meta.url.endsWith(".ts")) {
        throw error;
      }
      const fallbackUrl = new URL("./handlers/codex-agent.ts", import.meta.url);
      const fallbackModule = await import(fallbackUrl.href);
      return fallbackModule.codexAgent;
    });
  }
  return cachedCodexAgent;
}
function isModuleNotFound(error) {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && error.code === "ERR_MODULE_NOT_FOUND";
}
function parseJsonInput(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}
async function runPlugin(context) {
  const { logger, eventName } = context;
  if (isIssueCommentEvent(context)) {
    const codexAgent2 = await loadCodexAgent();
    return await codexAgent2(context);
  }
  logger.error(`Unsupported event: ${eventName}`);
}
async function mainFromActionsEnv() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs2.existsSync(eventPath)) return;
    const raw = fs2.readFileSync(eventPath, "utf8");
    const evt = JSON.parse(raw);
    const inputs = evt?.inputs || {};
    const eventName = inputs.eventName || evt?.event_name || "issue_comment.created";
    const payload = await decodeEventPayload(inputs.eventPayload);
    const authToken = typeof inputs.authToken === "string" ? inputs.authToken : "";
    const ubiquityKernelToken = typeof inputs.ubiquityKernelToken === "string" ? inputs.ubiquityKernelToken : "";
    const config = parseJsonInput(inputs.settings, {});
    const command = parseJsonInput(inputs.command, null);
    if (process.env.DEBUG_EVENT_RAW === "1") {
      console.log("[debug] GITHUB_EVENT_PATH raw JSON:");
      console.log(raw);
    }
    if (process.env.DEBUG_EVENT === "1") {
      console.log("[debug] workflow_dispatch inputs:", JSON.stringify(inputs));
      try {
        console.log("[debug] decoded eventPayload:", JSON.stringify(payload));
      } catch {
        console.log("[debug] decoded eventPayload: <non-json>");
      }
    }
    const logger = {
      info: (...args) => console.log("[info]", ...args),
      debug: (...args) => console.log("[debug]", ...args),
      warn: (...args) => console.warn("[warn]", ...args),
      ok: (msg, meta) => {
        console.log("[ok]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "info" },
          metadata: { message: String(msg), ...meta || {} }
        };
      },
      error: (msg, meta) => {
        console.error("[error]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "fatal" },
          metadata: { message: String(msg), ...meta || {} }
        };
      }
    };
    const { token: writeToken, source: tokenSource } = requirePatToken({ purpose: "GitHub API access" });
    const octokit = new customOctokit({ auth: writeToken });
    const context = {
      eventName,
      payload,
      env: process.env,
      logger,
      commentHandler: { postComment: async () => null },
      authToken: writeToken,
      ubiquityKernelToken,
      config,
      command,
      octokit
    };
    logger.info("[auth] Using PAT for GitHub API", { tokenSource, kernelAuthProvided: Boolean(authToken) });
    await runPlugin(context);
  } catch (e) {
    console.error("[fatal] Actions runner error", e);
    process.exit(1);
  }
}
async function decodeEventPayload(maybe) {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe;
  if (typeof maybe === "string") {
    try {
      const buf = Buffer.from(maybe, "base64");
      const decompressed = brotliDecompressSync(buf);
      return JSON.parse(decompressed.toString("utf8"));
    } catch {
      try {
        return JSON.parse(maybe);
      } catch {
        return { raw: maybe };
      }
    }
  }
  return {};
}
mainFromActionsEnv().catch((e) => {
  console.error(e);
  process.exit(1);
});
export {
  runPlugin
};
/*! Bundled license information:

@octokit/request-error/dist-src/index.js:
@octokit/request-error/dist-src/index.js:
@octokit/request-error/dist-src/index.js:
  (* v8 ignore else -- @preserve -- Bug with vitest coverage where it sees an else branch that doesn't exist *)

@octokit/request/dist-bundle/index.js:
@octokit/request/dist-bundle/index.js:
  (* v8 ignore next -- @preserve *)
  (* v8 ignore else -- @preserve *)
*/
//# sourceMappingURL=index.js.map