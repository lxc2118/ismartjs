/**
 * User: Administrator
 * Date: 13-10-19
 * Time: 下午3:32
 */
/**
 * 模板处理
 * */

(function ($) {

    var OUT_SCRIPT = " var out = {\n" +
        "     output : [],\n" +
        "     print : function(str){\n" +
        "          this.output.push(str);\n" +
        "     },\n" +
        "     println : function(str){\n" +
        "          this.print(str == null ? '' : str + '\\n');\n" +
        "     }\n" +
        " };\n";
    var compile = function (body) {
        var scripts = [];
        scripts.push(OUT_SCRIPT);
        var line = [];
        var inScriptFlag = false;
        var writeLine = function (type) {
            var lineStr = line.join("");
            if (type == "script") {
                //TODO FIX LATTER 对于 out.print("xxx lt xxx");这样的脚本，则也会替换成 out.print("xxx < xxx");这样
                lineStr = lineStr.replace(/\slt\s/gi,"<").replace(/\sgt\s/gi, ">");
                scripts.push(lineStr);
                line = [];
            } else {
                if ($.trim(lineStr) == "") {
                    line = [];
                    return;
                }
                lineStr = lineStr.replace(/'/gi, "\\'");
                scripts.push("out.print('" + lineStr + "');");
                line = [];
            }
        };
        var scriptOutputFlag = false;
        var skipFlag = false;
        for (var i = 0; i < body.length; i++) {
            var char = body[i];
            if(char == "\n"){
                if (!inScriptFlag) {
                    writeLine("output");
                    line.push("\\n");
                    writeLine("output");
                } else {
                    line.push(char);
                }
                continue;
            }
            if(char == "\r"){
                continue;
            }
            if(char == "#"){
                if (body[i + 1] == "}" && skipFlag) {
                    writeLine("output");
                    i++;
                    continue;
                }
            }
            if(skipFlag){
                line.push(char);
                continue;
            }
            switch (char) {
                case "{" :
                    if (body[i + 1] == "#") {
                        //则表示skip，不做任何处理
                        skipFlag = true;
                        i++;
                        writeLine(inScriptFlag ? "script" : "output");
                        break;
                    }
                    if (body[i + 1] == "%" && !inScriptFlag) {//则说明脚本开始
                        writeLine("output");
                        i++;
                        inScriptFlag = true;
                        break;
                    }
                    line.push(char);
                    break;
                case "%" :
                    if (body[i + 1] == "}" && inScriptFlag) {//则说明脚本结束
                        if (scriptOutputFlag) {
                            line.push(");");
                            scriptOutputFlag = false;
                        }
                        i++;
                        inScriptFlag = false;
                        writeLine("script");
                        break;
                    }
                    line.push(char);
                    break;
                case "=" :
                    if (inScriptFlag && i - 2 >= 0 && body[i - 2] == "{" && body[i - 1] == "%") {//则表示是输出
                        line.push("out.print(");
                        scriptOutputFlag = true;
                    } else {
                        line.push(char);
                    }
                    break;
                default :
                    line.push(char);
                    break;
            }
        }
        writeLine("output");
        scripts.push("return out.output.join('');");
        return scripts.join("\n");
    }

    $.template = {
        compile: compile
    };
})(jQuery);
;/**
 * Created by Administrator on 2014/6/10.
 */

(function ($) {

    var SMART_NODE_CACHE_KEY = "_SMART_";

    var SMART_ATTR_KEY = "s";

    var LIFE_STAGE = {
        initial: "initial",
        prepared: "prepared",
        building: "building",
        build: "build",
        running: "running",
        run: "run",
        made: "made"
    };

    //控件生命周期的事件禁止冒泡
    var STOP_PROPAGATION_EVENT = ["made", "load", "loading", "close"];

    var NODE_ATTR_PREFIX = "s";

    var Smart = window.Smart = function (node) {
        this.node = node || $();
        this.node.data(SMART_NODE_CACHE_KEY, this);
        this._dataTable = {};
        this.lifeStage = LIFE_STAGE.initial;
        var that = this;
        $.each(STOP_PROPAGATION_EVENT, function (i, evt) {
            that.on(evt, function (e) {
                e.stopPropagation();
            });
        });
    };

    Smart.defineKey = SMART_ATTR_KEY;

    Smart.extend = function (obj, obj1) {
        if (arguments.length == 1) {
            obj1 = obj;
            obj = Smart;
        }
        return $.extend(obj, obj1);
    };
    Smart.fn = {
        extend: function (objs) {
            if (!$.isArray(objs)) {
                objs = [objs];
            }
            $.each(objs, function (i, obj) {
                Smart.extend(Smart.prototype, obj);
            });
        }
    };
    var SLICE = Array.prototype.slice;
    var TO_STRING = Object.prototype.toString;
    //utils
    Smart.extend({
        SLICE: SLICE,
        TO_STRING: TO_STRING,
        noop: function () {
        },
        uniqueId: function () {
            return "SMART_" + new Date().getTime();
        },
        removeArrayElement: function (el, array) {
            var i = $.inArray(el, array);
            if (i == -1)
                return array;
            return array.slice(0, i).concat(array.splice(i + 1));
        },
        equalArray: function (ary1, ary2) {
            if (ary1.length == 0 && ary2.length == 0) {
                return true;
            }
            if (ary1.length != ary2.length) {
                return false;
            }
            for (var i in ary1) {
                if (ary1[i] != ary2[i]) {
                    return false;
                }
            }
            return true;
        },
        isEmpty: function (val) {
            if (val == null) {
                return true;
            }
            if (TO_STRING.call(val) == "[object String]") {
                return $.trim(val).length == 0;
            }
            if (TO_STRING.call(val) == '[object Array]') {
                return val.length == 0;
            }
            return false;
        },
        isSmart: function (smart) {
            if (smart == undefined) {
                return false;
            }
            if (smart.constructor && smart.constructor == Smart) {
                return true;
            }
            return false;
        },
        isWidgetNode: function (node) {
            return node.attr(SMART_ATTR_KEY) !== undefined;
        },
        map: function (datas, key) {
            var _datas = [];
            for (var i = 0; i < datas.length; i++) {
                var d = datas[i];
                if ($.isFunction(key)) {
                    _datas.push(key(d));
                } else if (TO_STRING.call(key) == '[object String]') {
                    _datas.push(d[key]);
                }
            }
            return _datas;
        },
        serializeToObject: function (form) {
            if (!form.is("form")) {
                return {};
            }
            var data = {};
            var arrays = form.serializeArray();
            $.each(arrays, function (i, n) {
                var key = n.name;
                var value = n.value;
                var _value = data[key];
                if (_value === undefined) {
                    data[key] = value;
                    return;
                }
                if ($.isArray(_value)) {
                    _value.push(value);
                } else {
                    data[key] = [_value, value];
                }
            });
            return data;
        },
        formData: function (nodes) {
            nodes = $(nodes);
            if (nodes.size() == 1 && nodes.is("form")) {
                return new FormData(nodes[0]);
            }
            var formData = new FormData();
            nodes.each(function () {
                var node = $(this);
                var name = node.attr("name");
                if (node.is(":file")) {//如果是文件域
                    $.each(this.files, function (i, file) {
                        formData.append(name, file);
                    });
                } else if (node.is(":checkbox,:radio")) {
                    if (node.prop("checked")) {
                        formData.append(name, node.val());
                    }
                } else {
                    formData.append(name, node.val());
                }
            });
            return formData;
        },
        httpSuccess: function (xhr) {
            try {
                return !xhr.status && location.protocol === "file:" ||
                    // Opera returns 0 when status is 304
                    ( xhr.status >= 200 && xhr.status < 300 ) ||
                    xhr.status === 304 || xhr.status === 1223 || xhr.status === 0;
            } catch (e) {
            }

            return false;
        },
        //获取配置的属性名。
        optionAttrName: function (id, name) {
            return NODE_ATTR_PREFIX + "-" + id + "-" + name;
        },
        //参数的fns为异步方法的数组，该方法都接受一个deferred的参数，该方法会依次执行，
        // 在上一个方法的deferred resolved的时候。如果一个方法的deferred没有被resolve，则不会执行下一个方法。
        //当所有方法执行完成时，才会触发deferredQueue的done。
        deferredQueue: function (fns) {
            var deferred = $.Deferred();
            if (arguments.length == 1) {
                if ($.type(fns) != "array") {
                    fns = [fns];
                }
            } else if (arguments.length > 1) {
                fns = SLICE.call(arguments);
            }

            function callFn(i) {
                if (i == fns.length) {
                    deferred.resolve();
                    return;
                }
                var fn = fns[i];
                if (!$.isFunction(fn)) {
                    callFn(i + 1);
                    return;
                }
                var fnDefer = fn();
                if (!fnDefer) {
                    callFn(i + 1);
                    return;
                }
                fnDefer.done(function () {
                    callFn(i + 1);
                }).fail(function () {
                    deferred.reject();
                });
            }

            callFn(0);
            return deferred.promise();
        },
        pick: function (node) {
            var smart = Smart.of();
            node.each(function () {
                var n = $(this);
                if (Smart.isWidgetNode(n)) {
                    smart.add(n);
                } else {
                    smart.add(Smart.of(n).children());
                }
            });
            return smart;
        },
        of: function (node) {
            if (Smart.isSmart(node)) {
                return node;
            }
            if (node === undefined || node.size() == 0) {
                return new Smart();
            }
            if (node.size() > 1) {
                var smart = Smart.of();
                $.each(node, function (i, n) {
                    smart.add($(n));
                });
                return smart;
            }
            var smart = node.data(SMART_NODE_CACHE_KEY);
            if (smart) {
                return smart;
            }
            smart = new Smart(node);
            node.data(SMART_NODE_CACHE_KEY, smart);
            return smart;
        },
        realPath: (function () {
            //路径处理，摘自seajs
            var DIRNAME_RE = /[^?#]*\//

            var DOT_RE = /\/\.\//g
            var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//

            // Extract the directory portion of a path
            // dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
            // ref: http://jsperf.com/regex-vs-split/2
            function dirName(path) {
                var ms = path.match(DIRNAME_RE);
                return ms ? ms[0] : "";
            }

            // Canonicalize a path
            // realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
            function realPath(path) {
                // /a/b/./c/./d ==> /a/b/c/d
                path = path.replace(DOT_RE, "/")

                // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
                while (path.match(DOUBLE_DOT_RE)) {
                    path = path.replace(DOUBLE_DOT_RE, "/")
                }

                return path;
            }

            return function (path, baseUrl) {
                if (/^(http|https|ftp|):.*$/.test(path)) {
                    return path;
                }
                path = baseUrl === undefined ? path : dirName(baseUrl) + path;
                return realPath(path);
            }
        })()
    });
    (function () {
        var console = window.console || {
            info: Smart.noop,
            debug: Smart.noop,
            warn: Smart.noop
        };

        Smart.extend({
            info: function () {
                console.info.apply(console, arguments);
            },
            error: function () {
                console.error.apply(console, arguments);
            },
            warn: function () {
                console.warn.apply(console, arguments);
            }
        });
    })();
    //扩展Smart prototype
    Smart.extend(Smart.prototype, {
        extend: function (api) {
            return $.extend(this, api);
        },
        each: function (fn) {
            this.node.each(function (i, node) {
                node = $(node);
                fn.call(Smart.of(node), i, node);
            });
        },
        parent: function () {
            var p = this.node.parent().closest("[" + SMART_ATTR_KEY + "]");
            if (p.size() == 0)
                p = Smart.of($(window));
            return Smart.of(p);
        },
        isWindow: function () {
            return this.node.size() == 1 ? this.node[0] == window : false;
        },
        add: function (smart) {
            if (Smart.isSmart(smart)) {
                smart = smart.node;
            }
            var that = this;
            smart.each(function (i, node) {
                that.node = that.node.add(node);
            });
        },
        size: function () {
            return this.node.size();
        },
        pick: function (selector) {
            var children = this.node.children();
            if (children.size() == 0)
                return Smart.of();
            var smart = Smart.of();
            $.map(children, function (child) {
                child = $(child);
                if (child.is(selector)) {
                    smart.add(child);
                } else {
                    //排除掉某些表单元素
                    /**
                     * input textarea radio checkbox img select
                     * */
                    if (child.is("input,textarea,radio,checkbox,img,select")) {
                        return;
                    }
                    smart.add(Smart.of(child).pick());
                }
            });
            return smart;
        },
        find: function (selector) {
            var nodes = this.node.find(selector);
            var smart = Smart.of();
            nodes.each(function () {
                smart.add($(this));
            });
            return smart;
        },
        children: function () {
            var children = this.node.children();
            if (children.size() == 0)
                return Smart.of();
            var smart = Smart.of();
            $.map(children, function (child) {
                child = $(child);
                if (child.attr(SMART_ATTR_KEY) !== undefined) {
                    smart.add(child);
                } else {
                    //排除掉某些表单元素
                    /**
                     * input textarea radio checkbox img select
                     * */
                    if (child.is("input,textarea,radio,checkbox,img,select")) {
                        return;
                    }
                    smart.add(Smart.of(child).children());
                }
            });
            return smart;
        }
    });

    Smart.extend(Smart.prototype, {
        setNode: function (node) {
            this.node.empty();
            return this._insertNode(node);
        },
        prependNode: function (node) {
            return this._insertNode(node, "prepend");
        },
        appendNode: function (node) {
            return this._insertNode(node);
        },
        _insertNode: function (node, mode) {
            try {
                if ($.type(node) == "string") {
                    node = $(node);
                }
                this.node[mode || "append"](node);
                Smart.pick(node).make();
                return this;
            } catch (e) {
                this.node[mode || "append"](node);
                Smart.error(e);
            }
        }
    });

    Smart.extend(Smart.prototype, {
        setContext: function (context) {
            this.hasContext = true;
            this._context = context;
            return this;
        },
        setContextSmart: function (smart) {
            this.node.each(function () {
                Smart.of($(this))._context_smart_ = smart;
            });
            return this;
        },
        context: (function () {
            var getContextSmart = function (smart) {
                if (smart.hasContext) {
                    return smart;
                }
                var parent = smart.parent();
                if (parent == null) {
                    return null;
                }
                return getContextSmart(parent);
            };
            return function () {
                var smart;
                if ("_context_smart_" in this) {
                    smart = this._context_smart_;
                } else {
                    smart = getContextSmart(this);
                    this.setContextSmart(smart);
                }
                if (smart.isWindow()) {
                    return null;
                }
                return smart._context.apply(this, $.makeArray(arguments));
            };
        })(),
        //用于保存控件生命周期过程中产生的数据。dataTable的简称，
        dataTable: function (namespace, key, val) {

            var fullKey = this._getDataTableKey(namespace, key);
            if (val === undefined) {
                return this._dataTable[fullKey];
            }
            this._dataTable[fullKey] = val;
            return this;
        },
        removeDataTable: function (namespace, key) {
            delete this._dataTable[this._getDataTableKey(namespace, key)];
            return this;
        },
        _getDataTableKey: function (namespace, key) {
            if (Smart.isEmpty(namespace)) {
                Smart.error("dataTable必须有命名空间");
                this.alert("dataTable必须有命名空间");
                return;
            }
            if (Smart.isEmpty(key)) {
                Smart.error("dataTable必须有key");
                this.alert("dataTable必须有key");
                return;
            }
            return namespace + "-" + key;
        },
        clearDataTable: function () {
            this._dataTable = {};
            return this;
        }
    });

    //控件
    (function () {
        var WIDGET_API_MAP = {};
        var WIDGET_LISTENER_MAP = {};
        var WIDGET_DEF_ID_MAP = {};

        var DEFAULT_LISTENER = {
            onData: Smart.noop,
            onPrepare: Smart.noop,//控件准备
            onBuild: Smart.noop,//构造，该方式异步方法
            onDestroy: Smart.noop
        }

        Smart.widgetExtend = function (def, listener, api) {
            if (TO_STRING.call(def) == "[object String]") {
                def = {id: def}
            }
            var id = def.id;
            WIDGET_DEF_ID_MAP[id] = def;
            api && (WIDGET_API_MAP[id] = api);
            listener && (WIDGET_LISTENER_MAP[id] = $.extend($.extend({}, DEFAULT_LISTENER), listener));
        };

        //扩展widget meta的defaultOptions
        Smart.widgetOptionsExtend = function (id, options) {
            var widgetDef = WIDGET_DEF_ID_MAP[id];
            if (widgetDef) {
                widgetDef.defaultOptions = $.extend(widgetDef.defaultOptions || {}, options);
            }
        };

        //根据id获取widget定义
        Smart.getWidgetDef = function (id) {
            return WIDGET_DEF_ID_MAP[id];
        };

        //最基本的控件。
        Smart.widgetExtend({
            id: "smart",
            options: "key, data, null"
        }, {
            onData: function () {
                var that = this;
                that.options.smart.data && that.data(that.options.smart.data);
                that._preDataArgs && that.data.apply(that, that._preDataArgs);
            }
        }, {
            dataGetter: Smart.noop,
            dataSetter: function (data) {
                var dataType = $.type(data);
                if (dataType == "boolean" || dataType == "number" || dataType == "string") {
                    //如果没有子元素
                    if (this.node.is("input[type='text'],select,textarea,input[type='password'],input[type='email'],input[type='number']")) {
                        this.node.val(data);
                        return;
                    }
                    if (this.node.is("input[type='radio']")) {
                        if (data + "" == this.node.val()) {
                            this.node.prop("checked", true);
                        }
                        return;
                    }
                    this.node.html(data);
                    return;
                }
                if (dataType == "array") {
                    if (this.node.is("input[type='checkbox']")) {
                        var val = this.node.val();
                        if ($.inArray(val, data) != -1) {
                            this.node.prop("checked", true);
                        }
                    }
                }
            },
            data: function () {
                if (arguments.length == 0) {
                    return this.dataGetter ? this.dataGetter.apply(this, SLICE.call(arguments)) : undefined;
                }
//                if(this.lifeStage != LIFE_STAGE.made){
//                    this._preDataArgs = SLICE.call(arguments);
//                    return;
//                }
                var args = SLICE.call(arguments);
                var dataKey = this.options.smart['key'];
                var value = args;
                if (dataKey) {
                    var data = args[0];
                    value = [data == undefined ? null : data[dataKey]];
                }
                value == null ? value = this.options.smart['null'] : value;
                this.dataSetter.apply(this, value);
            }
        });

        Smart.extend(Smart.prototype, {
            build: Smart.noop
        });

        var processOptions = function (smart, def) {
            if (def.options && def.options.length) {
                //组装 widget定义时的options属性，根据options属性从node上读取属性值
                var options = def.options;
                var optionsNames;
                var optionDefault = undefined;
                if (TO_STRING.call(options) === "[object Array]") {
                    optionsNames = $.trim(options[0]).split(",");
                    if (options.length > 1) {
                        optionDefault = options[1];
                    }
                } else {
                    optionsNames = $.trim(options).split(",");
                }
                var optionValues = {};
                for (var i in optionsNames) {
                    var key = $.trim(optionsNames[i]);
                    //如果key是以ctx:开头的，则说明key的值是根据该属性值从context中去取
                    var keyCtx = false;
                    if (/^ctx:.*$/.test(key)) {
                        key = key.substring(4);
                        keyCtx = true;
                    }
                    var valueCtx = false;
                    //根据option获取配置的属性，为 data-控件id-option
                    var attrKey = Smart.optionAttrName(def.id, key);
                    var value = smart.node.attr(attrKey);
                    if (/^ctx:.*$/.test(value)) {
                        value = value.substring(4);
                        valueCtx = true;
                    }
                    if (keyCtx || valueCtx) {
                        optionValues[key] = smart.context(value);
                    } else {
                        optionValues[key] = value;
                    }

                }
                if (optionDefault && TO_STRING.call(optionDefault) === '[object Object]') {
                    optionValues = $.extend(optionDefault, optionValues);
                }
                //mixin options与widget.defaultOptions
                var tmpOptions = {};
                if (def.defaultOptions) {
                    $.extend(tmpOptions, def.defaultOptions); //复制widget.defaultOptions
                }
                $.extend(tmpOptions, optionValues);
                smart.options[def.id] = tmpOptions;
            }
        };

        function processApis(smart, apis) {
            smart._inherited_api_map = {};

            for (var i in apis) {
                var api = apis[i];
                for (var key in api) {
                    if (key in smart) {
                        smart._inherited_api_map[api[key]] = smart[key];
                    }
                    smart[key] = api[key];
                }
            }

            //调用super的同方法
            smart.inherited = function (args) {
                var caller = arguments.callee.caller;
                var superFn = smart._inherited_api_map[caller];
                return superFn.apply(this, args);
            }
        }

        var makeSmart = function (smart) {

            var node = smart.node;
            var wIds = node.attr(SMART_ATTR_KEY);
            if (wIds == undefined) {
                return smart.makeChildren();
            }
            if (wIds == "") {
                wIds = "smart";
            }
            wIds = wIds.replace(/ /g, "");
            wIds = wIds.split(",");
            if (wIds[0] != "smart") {
                wIds.unshift("smart");
            }

            //控件监听器
            var widgetListeners = [];
            //控件API
            var widgetApis = [];
            //控件定义
            var widgetDefs = [];

            $.each(wIds, function (i, wId) {
                if (wId in WIDGET_API_MAP) {
                    widgetApis.push(WIDGET_API_MAP[wId]);
                }
                if (wId in WIDGET_DEF_ID_MAP) {
                    widgetDefs.push(WIDGET_DEF_ID_MAP[wId]);
                }
                if (wId in WIDGET_LISTENER_MAP) {
                    widgetListeners.push(WIDGET_LISTENER_MAP[wId]);
                }
            });

            //merge api
            processApis(smart, widgetApis);

            // 处理 控件option
            smart.options = {};
            $.each(widgetDefs, function (i, def) {
                processOptions(smart, def);
            });

            /**
             * 有些控件可能会自动设置某些控件的某个配置参数，所以提供这样的事件。
             * */
            smart.on("option", function (e, widgetId, key, value) {
                if ($.inArray(widgetId, wIds) == -1) {
                    return;
                }
                smart.options[widgetId][key] = value;
                e.stopPropagation();
            });

            //准备控件
            $.each(widgetListeners, function (i, listener) {
                if ("onPrepare" in listener) listener.onPrepare.call(smart);//每个api都需要prepare下。
            });

            smart.lifeStage = LIFE_STAGE.prepared;

            var deferreds = [];

            //构建控件，该过程是异步过程。
            $.each(widgetListeners, function (i, listener) {
                if ("onBuild" in listener) {
                    deferreds.push(function () {
                        return listener.onBuild.call(smart)
                    });
                }
            });

            //构建完成后，开始make子元素
            deferreds.push(function () {
                return smart.makeChildren();
            });

            //子元素made成功后，开始运行控件
            $.each(widgetListeners, function (i, listener) {
                if ("onData" in listener) {
                    deferreds.push(function () {
                        return listener.onData.call(smart)
                    });
                }
            });

            function resolve() {
                smart.lifeStage = LIFE_STAGE.made;
                smart.trigger("made");
            }

            return Smart.deferredQueue(deferreds).always(function () {
                resolve();
            });
        };
        Smart.prototype.makeChildren = function () {
            var children = this.children();
            if (children.size() == 0) {
                return $.Deferred().resolve();
            }
            var deferredFns = [];
            children.each(function () {
                var that = this;
                deferredFns.push(function () {
                    return that.make();
                });
            });

            return Smart.deferredQueue(deferredFns);
        };
        Smart.prototype.make = function () {
            try {
                if (this.lifeStage == LIFE_STAGE.made) {
                    Smart.warn("该控件已经创建过了！");
                    return $.Deferred().resolve();
                }
                var length = this.size();
                if (length == 0) {
                    return $.Deferred().resolve();
                }
                if (length > 1) {
                    var dFns = [];
                    this.each(function () {
                        var that = this;
                        dFns.push(function () {
                            return that.make();
                        });
                    });
                    return Smart.deferredQueue(dFns);
                }
                return makeSmart(Smart.of(this.node));
            } catch (e) {
                Smart.error("make Smart error: " + e);
            } finally {
                return $.Deferred().resolve();
            }
        }
    })();

    //ui扩展
    Smart.extend(Smart.prototype, {
        alert: function (msg) {
            window.alert(msg);
        }
    });

    //事件，事件依赖与jquery的事件。
    Smart.extend(Smart.prototype, {
        on: function (events, selector, fn) {
            this.node.on(events, selector, fn);
            return this;
        },
        off: function (events, selector, fn) {
            this.node.off(events, selector, fn);
            return this;
        },
        bind: function (type, data, fn) {
            this.node.bind(type, data, fn);
            return this;
        },
        trigger: function (type, data) {
            this.node.trigger(type, data);
            return this;
        },
        unbind: function (type, data) {
            this.node.unbind(type, data);
            return this;
        }
    });

    //生命周期事件接口,这些事件都不是冒泡事件
    (function () {
        Smart.extend(Smart.prototype, {
            onMade: function (fn) {
                var that = this;
                if (this.lifeStage == LIFE_STAGE.made) {
                    fn.call(that);
                }
                this.on("made", function () {
                    fn.apply(that, SLICE.call(arguments));
                });
                return this;
            }
        })
    })();

    //AJAX扩展
    (function () {

        var URL_PLACEHOLDER_REGEX = /\{([^}]+)}/gi;

        var ajaxCfg = {
            startTip: "正在操作，请稍候……",
            successTip: "操作成功",
            errorTip: "操作失败",
            silent: false,
            getErrorMsg: function (xhr, url) {
                if (xhr.status == "404") {
                    return url + " " + xhr.statusText;
                }
                return xhr.responseText;
            }
        };

        Smart.ajaxSetup = function (cfg) {
            $.extend(ajaxCfg, cfg);
        };

        $.each(['get', 'post', 'put', 'remove', 'update'], function (i, method) {
            Smart.prototype[method] = function (url, data, type, cfg, ajaxSetting) {
                if (TO_STRING.call(type) == "[object Object]") {
                    cfg = type;
                    type = null;
                }

                cfg = $.extend($.extend({}, ajaxCfg), cfg || {});

                if (method == 'remove') {
                    method = 'delete';
                }
                type = type || "json";//默认json请求
                var deferred = $.Deferred();
                if (!cfg.silent) {
                    this.trigger("ajaxStart", [cfg.startTip]);
                }
                var _this = this;
                //处理url
                url = url.replace(URL_PLACEHOLDER_REGEX, function ($1, $2) {
                    return _this.context($2);
                });
                var ajaxOptions = {
                    url: url,
                    type: method,
                    dataType: type,
                    data: data,
                    cache: false
                };
                if (data != undefined && (data.constructor == FormData || data.constructor == File)) {
                    ajaxOptions.contentType = false;
                    ajaxOptions.processData = false;
                }
                $.extend(ajaxOptions, ajaxSetting || {});
                $.ajax(ajaxOptions).done(function (result) {
                    deferred.resolve.apply(deferred, SLICE.call(arguments));
                    if (!cfg.silent) {
                        _this.trigger("ajaxSuccess", [cfg.successTip]);
                    }
                }).fail(function (xhr) {
                    deferred.reject.apply(deferred, SLICE.call(arguments));
                    if (!cfg.silent) {
                        _this.trigger("ajaxError", [cfg.errorTip, ajaxCfg.getErrorMsg(xhr, url)]);
                    }
                }).always(function () {
                    deferred.always.apply(deferred, SLICE.call(arguments));
                    if (!cfg.silent) {
                        _this.trigger("ajaxComplete");
                    }
                });
                return deferred;
            };
        });
    })();

    //加载文件
    Smart.loadFiles = (function () {
        var loadedFiles = [];
        var loadingFiles = {};
        var loadJs = function (jsFile, baseUrl) {
            var deferred = $.Deferred();
            var path = Smart.realPath(jsFile, baseUrl);
            if (path in loadingFiles) {
                loadingFiles[path].push(deferred);
                return deferred;
            }
            //检查是否加载过
            if ($.inArray(path, loadedFiles) != -1 || $("script[src$='" + path + "']").size() != 0) {
                deferred.resolve();
                return deferred;
            }
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = path;

            if (path in loadingFiles) {
                var deferreds = loadingFiles[path];
                deferreds.push(deferred);
            } else {
                loadingFiles[path] = [deferred];
            }

            script.onload = function () {
                loadedFiles.push(path);
                var deferreds = loadingFiles[path];
                delete loadingFiles[path];
                $.each(deferreds, function (i, defer) {
                    defer.resolve();
                });
            };
            script.onerror = function () {
                Smart.error("未能加载：" + jsFile);
                loadedFiles.push(path);
                deferred.resolve();
            };
            document.getElementsByTagName("head")[0].appendChild(script);
            return deferred;
        };
        var loadCss = function (cssFile, baseUrl) {
            var deferred = $.Deferred();
            var path = Smart.realPath(cssFile, baseUrl);
            //检查是否加载过
            if ($.inArray(path, loadedFiles) != -1 || $("link[href$='" + path + "']").size() != 0) {
                deferred.resolve();
                return deferred;
            }
            var styleLink = document.createElement("link");
            styleLink.rel = "stylesheet";
            styleLink.href = path;
            document.getElementsByTagName("head")[0].appendChild(styleLink);
            loadedFiles.push(path);
            deferred.resolve();
            return deferred;
        };

        var loadFile = function (file, baseUrl) {
            if (/^.*\.css([?,#].*){0,1}$/.test(file)) { //如果是css文件
                return loadCss(file, baseUrl);
            }
            if (/^.*\.js([?,#].*){0,1}$/.test(file)) { //如果是js文件
                return loadJs(file, baseUrl);
            }
        };

        return function (files, baseUrl) {
            var deferred = $.Deferred();
            if (files === undefined) {
                deferred.resolve();
                return;
            }
            if (!$.isArray(files)) {
                files = files.split(",");
            }
            var _load = function () {
                if (!files.length) {
                    deferred.resolve();
                } else {
                    loadFile(files.shift(), baseUrl).done(function () {
                        _load();
                    }).fail(function () {
                        deferred.resolve();
                    });
                }
            }
            _load();
            return deferred;
        }
    })();
})(jQuery);;/**
 * Created by Administrator on 2014/6/27.
 */
(function ($) {

    var CHECK_ITEM_SELECTOR = "*[" + Smart.optionAttrName('check', 'role') + "='i']";
    var CHECK_ITEM_HANDLER_SELECTOR = "*[" + Smart.optionAttrName('check', 'role') + "='h']";
    var CHECK_PATH_ATTR = Smart.optionAttrName('check', 'path');
    //选中控件
    Smart.widgetExtend({
        id: "check",
        options: "i-checked-class, turn, multiple, ctx:checkall-h, h-checked-class, check-path",
        defaultOptions: {
            "turn": "on",
            "i-checked-class": "warning",
            multiple: "true",
            "h-checked-class": "s-ui-checked",
            "check-path": "false"
        }
    }, {
        onPrepare: function () {
            var that = this;
            this.node.delegate(CHECK_ITEM_SELECTOR, "click", function (e) {
                if (that.options.check.turn != "on") {
                    return;
                }
                that._toggleCheck($(this), e);
            });

            var checkallHandles = [];
            this.dataTable("check", "checkallHandles", checkallHandles);

            var innerCheckallHandle = $("*[s-check-role='checkall-h']", this.node);

            if (innerCheckallHandle.size() > 0) {
                checkallHandles.push(innerCheckallHandle);
                this.node.delegate("*[s-check-role='checkall-h']", "click", function (e) {
                    that._toggleCheckAll($(this));
                    e.stopPropagation();
                });
            }
            if (this.options.check['checkall-h']) {
                checkallHandles.push(this.options.check['checkall-h']);
                this.options.check['checkall-h'].click(function (e) {
                    that._toggleCheckAll($(this));
                    e.stopPropagation();
                });
            }

            this.node.delegate(CHECK_ITEM_SELECTOR, "unchecked", function (e) {
                innerCheckallHandle.size() && that._uncheckHandles(innerCheckallHandle);
                that.options.check['checkall-h'] && that._uncheckHandles(that.options.check['checkall-h']);
                that.options.check['checkall-h'] && that.options.check['checkall-h'].prop("checked", false);
                e.stopPropagation();
            });
        }
    }, {
        turn: function (type) {
            this.options.check.turn = type;
            if(type != "on"){
                $(CHECK_ITEM_HANDLER_SELECTOR, this.node).prop("disabled", true);
            } else {
                $(CHECK_ITEM_HANDLER_SELECTOR, this.node).prop("disabled", false);
            }
        },
        _toggleCheckAll: function (node) {
            var flag;
            if (node.hasClass(this.options.check['h-checked-class'])) {
                flag = false;
                node.removeClass(this.options.check['h-checked-class']);
            } else {
                flag = true;
                node.addClass(this.options.check['h-checked-class']);
            }
            flag ? this.checkAll() : this.uncheckAll();
        },
        checkAll: function(){
            this._checkHandlesByFlag(true);
            var that = this;
            $(CHECK_ITEM_SELECTOR, this.node).each(function () {
                that._checkNode($(this));
            });
        },
        uncheckAll: function(){
            this._checkHandlesByFlag(false);
            var that = this;
            $(CHECK_ITEM_SELECTOR, this.node).each(function () {
                that._uncheckNode($(this));
            });
        },
        _checkHandlesByFlag: function (flag) {
            var checkallHandles = this.dataTable("check", "checkallHandles");
            var that = this;
            $.each(checkallHandles, function () {
                flag ? that._checkHandle($(this)) : that._uncheckHandles($(this));
            });
        },
        _checkHandle: function (node) {
            node.addClass(this.options.check['h-checked-class']);
            if (node.is(":checkbox")) {
                node.prop("checked", true);
            }
        },
        _uncheckHandles: function (node) {
            node.removeClass(this.options.check['h-checked-class']);
            if (node.is(":checkbox")) {
                node.prop("checked", false);
            }
        },
        getChecked: function () {
            if (this.options.check['multiple'] == "true") {
                var smarts = [];
                $.each($(CHECK_ITEM_SELECTOR + "." + this.options.check['i-checked-class'], this.node), function () {
                    smarts.push(Smart.of($(this)));
                });
                return smarts;
            } else {
                var node = $(CHECK_ITEM_SELECTOR + "." + this.options.check['i-checked-class'], this.node);
                return Smart.of($(node[0]));
            }
        },
        _toggleCheck: function (node, e) {
            //如果选择项下面拥有选择句柄，而且选择事件不是选择句柄发出的，则跳过。
            if (e && $(CHECK_ITEM_HANDLER_SELECTOR, node).size() > 0) {
                if (!$(e.target).is(CHECK_ITEM_HANDLER_SELECTOR)) {
                    return;
                }
            }
            var checkedClass = this.options.check['i-checked-class'];
            if (node.hasClass(checkedClass)) {
                this._uncheck(node);
            } else {
                this._check(node);
            }
        },
        _check: function (node) {
            if (node.hasClass(this.options.check['i-checked-class'])) {
                return;
            }
            //如果是单选，则需要把其他的item取消选中
            var that = this;
            if (this.options.check.multiple == "false") {
                $(CHECK_ITEM_SELECTOR, this.node).not(node).each(function () {
                    that._uncheck($(this));
                });
            }

            this._checkNode(node);
            if (this.options.check['check-path'] == 'true') this._checkNextUntil(node);
        },
        _checkNextUntil: function (node) {
            var i = node.attr(CHECK_PATH_ATTR);
            //将下级的所有节点选中
            var nextNodes = node.nextUntil(":not(*[" + CHECK_PATH_ATTR + "^=" + i + "/])");
            var that = this;
            nextNodes.each(function () {
                that._checkNode($(this));
            });
        },
        _uncheck: function (node) {
            if (!node.hasClass(this.options.check['i-checked-class'])) {
                return;
            }
            this._uncheckNode(node);
            if (this.options.check['check-path'] == 'true') {
                //取消选中下级的所有节点
                this._uncheckPrevUntil(node);
                //取消选中所有的上级节点
                this._uncheckNextUntil(node);
            }
        },
        _uncheckNextUntil: function (node) {
            var i = node.attr(CHECK_PATH_ATTR);
            //将下级的所有节点取消选中
            var nextNodes = node.nextUntil(":not(*[" + CHECK_PATH_ATTR + "^=" + i + "/])");
            var that = this;
            nextNodes.each(function () {
                that._uncheckNode($(this));
            });
        },
        _uncheckPrevUntil: function (node) {
            var path = node.attr(CHECK_PATH_ATTR);
            if (path == undefined) {
                return;
            }
            var segs = path.split("/");
            var currentNode = node;
            while (segs.length > 2) {
                segs.pop();
                var p = segs.join("/");
                var attr = "*[" + CHECK_PATH_ATTR + "=" + p + "]";
                var prevNode = currentNode.prevUntil(attr).last().prev();
                if (prevNode.size() == 0) {
                    prevNode = currentNode.prev();
                }
                if (prevNode.is(attr)) {
                    currentNode = prevNode;
                    this._uncheckNode(prevNode);
                }
            }
        },
        _checkNode: function (node) {
            if (node.hasClass(this.options.check['i-checked-class'])) {
                return;
            }
            node.addClass(this.options.check['i-checked-class']).trigger("checked");

            var handler = $(CHECK_ITEM_HANDLER_SELECTOR, node);
            if (handler.size() == 0) return;
            handler.addClass(this.options.check['h-checked-class']);
            if (handler.is(":checkbox")) {
                setTimeout(function () {
                    if (!handler.prop("checked")) handler.prop("checked", true);
                }, 1);
            }
        },
        _uncheckNode: function (node) {
            if (!node.hasClass(this.options.check['i-checked-class'])) {
                return;
            }
            node.removeClass(this.options.check['i-checked-class']).trigger("unchecked");
            var handler = $(CHECK_ITEM_HANDLER_SELECTOR, node);
            if (handler.size() == 0) return;
            handler.removeClass(this.options.check['h-checked-class']);
            if (handler.is(":checkbox")) {
                setTimeout(function () {
                    if (handler.prop("checked")) handler.prop("checked", false);
                }, 1);
            }
        }
    });
})(jQuery);;/**
 * Created by Administrator on 2014/6/21.
 */
(function(){
    //为子控件赋值控件。
    Smart.widgetExtend({
        id: "datac"
    },null, {
        dataSetter: function(){
            var args = Smart.SLICE.call(arguments);
            var igAttr = Smart.optionAttrName("datac", "ig");
            this.children().each(function(){
                var ig = this.node.attr(igAttr);
                if(ig == "true" || ig == ""){
                    return;
                }
                this.data.apply(this, args);
            });
        }
    });
})();;/**
 * Created by Administrator on 2014/6/19.
 */
(function(){
    Smart.extend({
        eventAction: (function () {

            var getActionSmart = function (smart) {
                if (smart.action) {
                    return smart;
                }
                var parent = smart.parent();
                if (parent == null || parent.isWindow()) {
                    return null;
                }
                return getActionSmart(parent);
            };

            return function (smart, script) {
                var actionSmart = getActionSmart(smart);
                var script_body = [];
                script_body.push("var e = arguments[1];");
                script_body.push(script);
                if (actionSmart == null) {
                    var window_body = [];
                    window_body.push("(function(){");
                    window_body.push("      return function(){");
                    window_body.push("          "+script_body.join("\n"));
                    window_body.push("      }")
                    window_body.push("})()");
                    return eval(window_body);
                } else {
                    return actionSmart.action(script_body.join("\n"));
                }
            }
        })()
    });
    var bindEvent = function(smart, event, action){
        if(Smart.isEmpty(event) || Smart.isEmpty(action)){
            return;
        }
        action = Smart.eventAction(smart, action);
        smart.node[event](function (e) {
            var result = action.call(smart, e);
            if(result == null) return;
            if(result.done && $.isFunction(result.done)){//说明这个是deferred对象
                var target = $(e.target);
                target.attr("disabled", 'disabled').addClass("disabled");
                result.always(function(){
                    target.removeAttr("disabled").removeClass("disabled");
                });
            }
            return result;
        });
    };
    Smart.widgetExtend({id:"event",options:"type,action"}, {
        onPrepare: function(){
            var action = this.options.event['action'];
            var event = this.options.event["type"];
            bindEvent(this, event, action);
        }
    });
    Smart.widgetExtend({id:"click",options:"action"}, {
        onPrepare: function(){
            var action = this.options.click['action'];
            bindEvent(this, "click", action);
        }
    });
    Smart.widgetExtend({id:"change",options:"action"}, {
        onPrepare: function(){
            var action = this.options.change['action'];
            bindEvent(this, "change", action);
        }
    });
    Smart.widgetExtend({id:"focus",options:"action"}, {
        onPrepare: function(){
            var action = this.options.focus['action'];
            bindEvent(this, "focus", action);
        }
    });
    Smart.widgetExtend({id:"blur",options:"action"}, {
        onPrepare: function(){
            var action = this.options.blur['action'];
            bindEvent(this, "blur", action);
        }
    });
    Smart.widgetExtend({id:"dblclick",options:"action"}, {
        onPrepare: function(){
            var action = this.options.dblclick['action'];
            bindEvent(this, "dblclick", action);
        }
    });
    Smart.widgetExtend({id:"mouseover",options:"action"}, {
        onPrepare: function(){
            var action = this.options.mouseover['action'];
            bindEvent(this, "mouseover", action);
        }
    });
    Smart.widgetExtend({id:"mousemove",options:"action"}, {
        onPrepare: function(){
            var action = this.options.mousemove['action'];
            bindEvent(this, "mousemove", action);
        }
    });
    Smart.widgetExtend({id:"mouseout",options:"action"}, {
        onPrepare: function(){
            var action = this.options.mouseout['action'];
            bindEvent(this, "mouseout", action);
        }
    });

    //停止冒泡
    Smart.widgetExtend({
        id : "stopPropagation",
        options: "events",
        defaultOptions: {
            events: "click"
        }
    },{
        onPrepare: function(){
            this.node.on(this.options.stopPropagation.events, function(e){
                e.stopPropagation();
            });
        }
    })
})();;/**
 * Created by Administrator on 2014/7/3.
 */
(function(){
    var checkPathAttr = Smart.optionAttrName("check",'path');
    Smart.widgetExtend({
        id: "loopCheckCombine"
    },{
        onPrepare: function(){

            this.on("row-add", function(e, row, data, indentNum){
                var path = [""];
                for(var i = 0; i <= indentNum; i++){
                    path.push(i);
                }
                row.attr(checkPathAttr, path.join("/"));
            });

            //设置check控件的 check-path 配置为true
            this.trigger("option", ["check", 'check-path', 'true']);
        }
    });
})();;/**
 * Created by Administrator on 2014/6/26.
 */
(function($){

    var roleAttr = Smart.optionAttrName("loop", "role");

    function getRoleNode(val, node){
        return $("*["+roleAttr+"='"+val+"']", node);
    }

    //loop控件，可以用该控件来构建列表，grid。
    Smart.widgetExtend({
        id: "loop",
        options: "type,tree-c,tree-indent-width,tree-indent-str",
        defaultOptions: {
            'tree-c': "children",
            indent: 20
        }
    }, {
        onPrepare: function(){
            var emptyRow = getRoleNode("empty", this.node);
            var loopRow = getRoleNode("row", this.node);
            this.node.empty();
            this.dataTable("loop", "emptyRow", emptyRow);
            this.dataTable("loop", "loopRow", loopRow);
        }
    },{
        empty: function(){
            this.node.empty();
        },
        addRow: function(data, indentNum, mode){
            var row = this._getRow();
            if(indentNum){
                var indentNode = row.find('*[s-loop-tree-role="indent"]');
                if(this.options.loop['tree-indent-str']){
                    var str = this.options.loop['tree-indent-str'];
                    for(var i = 1; i < indentNum; i++){
                        str += str;
                    }
                    indentNode.prepend(str);
                } else if(indentNode.size() >= 0){
                    indentNode.css("text-indent", this.options.loop.indent * indentNum + "px");
                }

            }
            var rowSmart = Smart.of(row);
            rowSmart.on("made", function(){
                rowSmart.data(data);
            });
            this[(mode || "append")+"Node"](row);
            this.trigger("row-add", [row, data, indentNum, mode]);
        },
        addRows: function(datas, indentNum, mode){
            indentNum = indentNum == undefined ? 0 : indentNum;
            for(var i = 0; i < datas.length; i++){
                this.addRow(datas[i], indentNum, mode);
                //如果是tree的方式
                if(this.options.loop.type == "tree"){
                    var children = datas[i][this.options.loop['tree-c']];
                    if(children && children.length){
                        this.addRows(children, indentNum + 1, mode);
                    }
                }
            }
        },
        _getRow: function(){
            var row = this.dataTable("loop", "loopRow").clone();
            return row;
        },
        _addEmptyRow: function(){
            var emptyRow = this.dataTable("loop", "emptyRow");
            if(emptyRow){
                this.node.append(emptyRow.clone());
            }
        },
        setRows: function(datas){
            this.empty();
            if(datas.length == 0){
                this._addEmptyRow();
                return;
            }
            this.addRows(datas);
        },
        dataSetter: function(data){
            if(!$.isArray(data)){
                Smart.error("loop控件接受的赋值参数必须是数组");
            }
            this.setRows(data);
        }
    });
    Smart.widgetExtend({
        id: "row",
        options: "ctx:render"
    }, null, {
        dataSetter: function(data){
            this.dataTable("row", "data", data);
            this.inherited([data]);
            this.options.row.render && this.options.row.render.call(this, this.node);
        },
        dataGetter: function(){
            return this.dataTable("row", "data");
        }
    });
})(jQuery);;/**
 * Created by Administrator on 2014/6/21.
 */
(function(){
    //将该元素的所有 拥有 name 属性的子元素 适配成可接受赋值的控件，即默认的控件。
    //name的值作为 data-key的值，data-accept设置为true
    Smart.widgetExtend("nda", {
        onPrepare: function(){
            this.node.find("*[name]").each(function(){
                var nameNode = $(this);
                if(!Smart.isWidgetNode(nameNode)){
                    //如果不是控件
                    //则把它声明成为一个基本控件
                    nameNode.attr(Smart.defineKey, "");
                }
                var attrName = Smart.optionAttrName("smart", "key");
                if(Smart.isEmpty(nameNode.attr(attrName))){
                    nameNode.attr(attrName, nameNode.attr("name"));
                }
            });
        }
    });
})();;/**
 * Created by Administrator on 2014/6/21.
 */
(function () {

    var STAGE = {
        build: {
            id: "build",
            resourceKey: "__original_build_resource_key__"
        },
        data: {
            id: "data",
            resourceKey: "__original_data_resource_key__"
        }
    };

    Smart.widgetExtend({
        id: "resource",
        options: "data-res,ctx:data-form,ctx:data-adapter,ctx:data-cascade,data-cascade-key," +
            "build-res,ctx:build-form,ctx:build-adapter,ctx:build-cascade,build-cascade-key"
    }, {
        onPrepare: function () {
            //级联
            if (this.options.resource['data-cascade']) {
                this.options.resource[STAGE.data.resourceKey] = this.options.resource['data-res'];
                var that = this;
                this.options.resource['data-cascade'].change(function () {
                    that._cascadeLoad(STAGE.data.id);
                });
            }
            if (this.options.resource['build-cascade']) {
                this.options.resource[STAGE.build.resourceKey] = this.options.resource['build-res'];
                var that = this;
                this.options.resource['build-cascade'].change(function () {
                    that._cascadeLoad(STAGE.build.id);
                });
            }
        },
        onBuild: function () {
            return this._onBuild();
        },
        onData: function () {
            return this._onData();
        }
    }, {
        _cascadeLoad: function (stage) {
            var cascade = this.options.resource[stage + '-cascade'];
            var val = cascade.val();
            var resKey = stage + '-res';
            var originalRes = this.options.resource[STAGE[stage].resourceKey];
            var cascadeKeyKey = stage + '-cascade-key';
            this.options.resource[resKey] = originalRes.replace("{val}", val);
            if (this.options.resource[cascadeKeyKey]) {
                var param = {};
                param[this.options.resource[cascadeKeyKey]] = val;
                this.dataTable("resource", "param", param);
            }
            return this._load(this.options.resource[resKey], param, stage);
        },
        _load: function (resource, param, stage) {
            var deferred = $.Deferred();
            if (resource == undefined) {
                return deferred.resolve();
            }
            var type = "json";
            if (/^.+:.+$/.test(resource)) {
                var idx = resource.indexOf(":");
                type = resource.substring(idx);
                resource = resource.substring(idx + 1);
            }
            var that = this;
            var form = this.options.resource[stage + "-form"];
            var adapter = this.options.resource[stage + "-adapter"];
            var param = this.dataTable("resource", "param") || {};
            if (form) {
                var formParam = Smart.serializeToObject(form);
                $.extend(param, formParam);
            }
            this.get(resource, param, type).done(function (rs) {
                if ($.isFunction(adapter)) {
                    rs = adapter(rs);
                }
                if (stage == STAGE.build.id) {
                    that.build(rs);
                } else if (stage == STAGE.data.id) {
                    that.data(rs);
                }
                deferred.resolve();
            }).fail(function () {
                deferred.reject();
            });
            return deferred.promise();
        },
        _onBuild: function () {
            if (this.options.resource['build-cascade']) {
                if (Smart.isWidgetNode(this.options.resource['build-cascade'])) {
                    var deferred = $.Deferred();
                    var that = this;
                    Smart.of(this.options.resource['build-cascade']).onMade(function () {
                        that._cascadeLoad(STAGE.build.id);
                        deferred.resolve();
                    });
                    return deferred.promise();
                }
                return this._cascadeLoad(STAGE.build.id);
            }
            return this._load(this.options.resource['build-res'], {}, STAGE.build.id);
        },
        _onData: function () {
            if (this.options.resource['data-cascade']) {
                if (Smart.isWidgetNode(this.options.resource['data-cascade'])) {
                    var deferred = $.Deferred();
                    var that = this;
                    Smart.of(this.options.resource['data-cascade']).onMade(function () {
                        that._cascadeLoad(STAGE.data.id);
                        deferred.resolve();
                    });
                    return deferred.promise();
                }
                return this._cascadeLoad(STAGE.data.id);
            }
            return this._load(this.options.resource['data-res'], {}, STAGE.data.id);
        },
        buildRefresh: function () {
            return this._onBuild();
        },
        refresh: function () {
            return this._onData();
        }
    });
})();;/**
 * Created by Administrator on 2014/6/21.
 */
//模板控件。
(function(){
    var token = 0;
    var TABLE_FN_KEY = "_TPL_FN_";
    Smart.widgetExtend("tpl", {
        onPrepare: function(){
            var tplText = this.node.html();
            this.node.empty();
            //处理脚本定义中的 lt,gt lt 处理成 <, gt处理成 >。
            //tplText = tplText.replace(/\slt\s/gi,"<").replace(/\sgt\s/gi, ">");
            var compiledText = $.template.compile(tplText);
            var scripts = [];
            scripts.push("(function(){");
            scripts.push("      return function(){");
            scripts.push(compiledText);
            scripts.push("      }");
            scripts.push("})();//@ sourceURL=" + (token++) + "_template.js");
            var script = scripts.join("\n");
            var fn = eval(script);
            this.dataTable("tpl", TABLE_FN_KEY, fn);
        }
    },{
        dataSetter: function(data){
            this._insertData(data);
        },
        appendData: function(data){
            this._insertData(data, "appendNode");
        },
        prependData: function(data){
            this._insertData(data, "prependNode");
        },
        _insertData: function(data, mode){
            var fn = this.dataTable("tpl", TABLE_FN_KEY);
            var html = fn.call(data);
            this[mode || "setNode"](html);
        }
    });
})();;/**
 * Created by Administrator on 2014/6/11.
 */
(function ($) {
    var SCRIPT_RE = /<script((?:.|\s)*?)>((?:.|\s)*?)<\/script>/gim;
    var META_RE = /<meta(.*?)\/>/gim;
    var META_ITEM_RE = /(\S+)=(['"])([^\2]*?)\2/gi;

    var META_VALUE_RE = /\{%=(.*)%}/gi;

    var parseMeta = function (str) {
        var meta = {};
        str.replace(META_ITEM_RE, function ($0, $1, $2, $3) {
            meta[$1] = $3;
        });

        //特殊处理args参数
        if (meta.args && meta.args.length) {
            var argsStr = $.trim(meta.args);
            meta.args = [];
            $.each(argsStr.split(","), function (i, arg) {
                meta.args.push($.trim(arg));
            });
        }

        return meta;
    };
    var parseHtml = function (html) {
        var scriptTexts = [];
        var scriptSrcs = [];
        var meta = {};
        html = html.replace(META_RE, function ($0, $1) {
            meta = parseMeta($1);
            return "";
        });
        html = html.replace(SCRIPT_RE, function ($0, $1, $2) {
            var srcGroup = /src=(\S+)?/gi.exec($1);
            if (srcGroup && srcGroup.length == 2) {
                scriptSrcs.push(srcGroup[1].replace(/['"]/g, ""));
            }
            scriptTexts.push($2);
            return "";
        });
        return {
            meta: meta,
            html: html,
            scriptTexts: scriptTexts,
            scriptSrcs: scriptSrcs
        }
    };

    var process = function (result, href) {
        var html = result.html;
        var scriptTexts = result.scriptTexts;
        var applyArgs = Smart.SLICE.call(arguments, 2);
        var scripts = [];
        //处理模板
        var meta = result.meta;
        var argsScripts = [];
        var metaScripts = [];
        scripts.push("(function(){");
        scripts.push("    return function(){");
        if (meta.args) { //则说明有参数传递进来，传递参数依次对应arguments的位置1开始一次往后
            $.each(meta.args, function (i, arg) {
                var argStr = "var " + arg + " = arguments[" + i + "];";
                metaScripts.push("var " + arg + " = arguments[" + (i + 1) + "];");
                argsScripts.push(argStr);
                scripts.push(argStr);
            });
        }
        scripts.push("var S = this;");
        scripts.push(scriptTexts.join("\n"));
        scripts.push("			return function(key){");
        scripts.push("				try{");
        scripts.push("					key += ';//@ sourceURL=" + href + "_context.js'");
        scripts.push("					return eval(key);");
        scripts.push("				}catch(e){Smart.error(e);}");
        scripts.push("			};");
        scripts.push("		};");
        scripts.push("})();//@ sourceURL=" + href + ".js");
        if (meta.template == "true") {//如果需要模板化处理才进行模板化处理。不做统一全部处理
            var compiledFnBody = [];
            compiledFnBody.push("(function(){");
            compiledFnBody.push("   return function(){\n");
            compiledFnBody.push(argsScripts.join("\n"));
            compiledFnBody.push($.template.compile(html));
            compiledFnBody.push("   }");
            compiledFnBody.push("})();//@ sourceURL=" + href + "_template.js");
            var fn = eval(compiledFnBody.join("\n"));
            html = fn.apply(this, applyArgs);
            html = html.replace(/\n{2,}/gm, "\n");
        }
        //替换掉id,为id加上当前窗口的窗口id TODO 正则表达式无法匹配，采用jQuery的方法替换
        //html = this._tidyId(html);

        this._WNODE = $(html);

        //替换掉id,为id加上当前窗口的窗口id TODO 正则表达式无法匹配，采用jQuery的方法替换
        var that = this;
        this._WNODE.find("*[id]").add(this._WNODE.filter("*[id]")).each(function () {
            var id = $(this).attr("id");
            $(this).attr("id", that.trueId(id)).attr("_id_", id);
        });
        this.meta = meta;
        this.dataTable("window","meta", meta);
        var metaScript = metaScripts.join("\n");
        metaScript += "\n  try{\n return eval(arguments[0]);\n}catch(e){\nreturn null}";
        var metaScript = new Function(metaScript);
        $.each(meta, function (key, val) {
            if (key == 'args') {
                return;
            }
            meta[key] = val.replace(META_VALUE_RE, function ($0, $1) {
                return metaScript.apply(this, [$1].concat(applyArgs));
            });
        });

        var scriptFn = eval(scripts.join("\n"));
        var context = scriptFn.apply(this, applyArgs);
        this.setContext(context);
        this.setNode(this._WNODE);
        //处理锚点滚动
        if (href.indexOf("#") != -1) {
            var anchor = href.substring(href.indexOf("#"));
            this.scrollTo(anchor);
        }
    };

    var CURRENT_WINDOW_ID = 0;

    var ON_BEFORE_CLOSE_FN_KEY = "_onBeforeCloseFns_";
    var EVENT_ON_CACHE = "_EVENT_ON_CACHE";

    var STOP_ANCHOR_SCROLLIN_KEY = "_stop_anchor_scrollin_";

    Smart.widgetExtend({
        id: "window",
        options: "href"
    }, {
        onData: function () {
            var deferred = $.Deferred();
            var options = this.options.window;
            if (options && options.href) {
                this.load(options.href).always(function () {
                    deferred.resolve()
                });
                return deferred.promise();
            } else {
                return deferred.resolve();
            }
        },
        onPrepare: function () {
            this._WINDOW_ID = "_w_" + (CURRENT_WINDOW_ID++);
            this[ON_BEFORE_CLOSE_FN_KEY] = [];
            this[EVENT_ON_CACHE] = [];
            if (!this.node.attr("id")) {
                this.node.attr("id", this._WINDOW_ID);
            }
        }
    },{
        refresh: function () {
            return this.load.apply(this, [this.currentHref()].concat(this.dataTable("window", "_loadArgs")));
        },
        currentHref: function(){
            return this.dataTable("window", "href");
        },
        load: function (href) {
            this._clean();
            this.dataTable("window", "loadState", true);//是否已经加载
            this.trigger("loading");
            var deferred = $.Deferred();
            var args = $.makeArray(arguments);
            this.dataTable("window","_loadArgs", args);
            var that = this;
            this.dataTable("window","href", href);
            this.get(href, null, "text").done(function (html) {
                var result = parseHtml(html);
                var scriptSrcs = result.scriptSrcs;
                Smart.loadFiles(scriptSrcs, href).done(function () {
                    process.apply(that, [result].concat(args));
                    //当页面存在锚点的时候，页面滚动的时候，监听锚点的位置，并触发事件。
                    that._listenAnchorPos();
                }).fail(function () {
                    Smart.error(href + "的依赖处理失败");
                }).always(function () {
                    that.trigger("load");
                    deferred.resolve(that);
                });
            }).fail(function(){
                that.trigger("load");
            });
            return deferred;
        },
        setMeta: function (key, value) {
            this.meta[key] = value;
            this.trigger("meta", key, value);
        },
        scrollTo: function (selector) {
            var anchorNode = selector;
            if ($.type(selector) == "string") {
                anchorNode = this.N(selector);
            }
            var deferred = $.Deferred();
            if (anchorNode.size() != 0) {
                var pos = anchorNode.position();
                var scrollTop = this.node.scrollTop();
                this.node.animate({
                    scrollTop: scrollTop + pos.top + "px"
                }, 400, "easeOutQuint", function () {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
            return deferred;
        },
        scrollToAnchor: function (id) {
            this.dataTable("window",STOP_ANCHOR_SCROLLIN_KEY, true);
            var that = this;
            return this.scrollTo("#" + id).done(function () {
                that.removeDataTable("window", STOP_ANCHOR_SCROLLIN_KEY);
            });
        },
        _listenAnchorPos: function () {
            var nodes = this._getAnchorNodes();
            var nodesLength = nodes.size();
            if (nodesLength > 0) {
                var that = this;
                var anchorScrollListener = function () {
                    if (that.dataTable("window", STOP_ANCHOR_SCROLLIN_KEY)) {
                        return;
                    }
                    var height = $(this).innerHeight();
                    for (var i = 0; i < nodesLength; i++) {
                        var node = $(nodes[i]);
                        var posTop = node.position().top;
                        if (posTop <= height / 3 && posTop >= 0) {
                            that.trigger("anchor.scrollin", node.attr("_id_"));
                            return;
                        }
                    }
                };
                this.on("clean", function(){
                    that.node.unbind("scroll", anchorScrollListener);
                });
                this.node.scroll(anchorScrollListener).on("anchor.scrollin", function (e) {
                    e.stopPropagation();
                });
            }
        },
        getAnchors: function () {
            var anchors = this.dataTable("window","_anchors_");
            if (!anchors) {
                anchors = [];
                this.dataTable("window","_anchors_", anchors);
                this._getAnchorNodes().each(function () {
                    var n = $(this);
                    anchors.push({id: n.attr("_id_"), title: n.attr("title")});
                });
            }
            return anchors;
        },
        _getAnchorNodes: function () {
            var attrName = Smart.optionAttrName("window", "role");
            return this.node.find("*["+attrName+"='a']");
        },
        _clean: function () {
            this.trigger("clean");
            this.clearDataTable();
            this[ON_BEFORE_CLOSE_FN_KEY] = [];
            var that = this;
            $.each(this[EVENT_ON_CACHE], function (i, paramAry) {
                that.off.apply(that, paramAry);
            });
        },
        //预关闭；
        preClose: function () {
            var deferred = $.Deferred();
            var onBeforeCloseFns = this[ON_BEFORE_CLOSE_FN_KEY];
            if (onBeforeCloseFns.length > 0) {
                Smart.deferredQueue(onBeforeCloseFns.reverse()).then(function () {
                    deferred.resolve();
                }, function () {
                    deferred.reject();
                });
            } else {
                return deferred.resolve();
            }
            return deferred.promise();
        },

        open: function(){
            var deferred = $.Deferred();
            var e = $.Event("open", {deferred: deferred, smart: this});
            this.trigger(e, $.makeArray(arguments));
            return deferred;
        },

        close: function () {
            //触发beforeClose监听事件。
            var that = this;
            var args = arguments;
            that.clearDataTable();
            var deferred = $.Deferred();
            deferred.done(function(){
                that.node.remove();
            });
            var event = $.Event("close", {deferred: deferred});
            that.trigger(event, Smart.SLICE.call(args));
            event.deferred['resolve'] && event.deferred.resolve();
        },
        closeWithConfirm: function () {
            var that = this;
            var args = arguments;
            return this.preClose().done(function () {
                that.close.apply(that, Smart.SLICE.call(args));
            });
        },
        //监听窗口关闭事件。
        onBeforeClose: function (fn) {
            this[ON_BEFORE_CLOSE_FN_KEY].push(fn);
            return this;
        },

        action: function (script) {
            var script_body = [];
//            script_body.push(" var e = arguments[1]; ");
//            script_body.push(script);
//            script_body = script_body.join("\n");
//            var ___context_holder__ = this;
//            var action = function (e) {
//                ___context_holder__.context.apply(this, [script_body, e]);
//            };
//            return action;
            script_body.push("(function(){");
            script_body.push("      return function(){");
            script_body.push("          "+script);
            script_body.push("      }")
            script_body.push("})()");
            return this.context(script_body.join("\n"));
        },
        _tidyId: function (html) {//整理清理html，
            //清理html的id
            var that = this;
            html = html.replace(/<\w+\s+(id=['"])(.+)(['"])\s*?[^>]*?>/gi, function ($0, $1, $2, $3) {
                return $1 + that.trueId($2) + $3;
            });
            return html;
        },
        S: function (selector) {
            var smart = Smart.of(this.N(selector));
            smart.setContextSmart(this);
            return smart;
        },
        N: function (selector) {
            var _selector = [];
            selector = selector.split(",");
            if(selector.length == 1){
                selector = selector[0];
                if (selector.charAt(0) == "#") {
                    selector = "#" + this.trueId(selector.substring(1));
                }
            } else {
                for(var i = 0; i < selector.length; i++){
                    var _sel = $.trim(selector[i]);
                    if (_sel.charAt(0) == "#") {
                        _sel = "#" + this.trueId(_sel.substring(1));
                    }
                    _selector.push(_sel);
                }
                selector = _selector.join(",");
            }

            return this._WNODE.filter(selector).add(this._WNODE.find(selector));
        },
        trueId: function (id) {
            return this._WINDOW_ID + "_" + id;
        },
        //这里修改on的方法，当页面渲染完成之后所有的on的事件都缓存起来，在refresh，和load新页面的时候要去除掉这些事件。
        on: function (events, selector, fn) {
            if(this.dataTable("window", "loadState")){
                //如果已经加载了，on的事件将会被记录，在重新load的时候会移除掉这些事件。
                this[EVENT_ON_CACHE].push([events, selector, fn]);
            }
            return this.inherited([events, selector, fn]);
        }
    });
})(jQuery);;/**
 * Created by Administrator on 2014/6/17.
 */
(function($){
    var zIndex = 1000;
    var UI_TEMPLATE = {};
    Smart.UI = {
        zIndex:function(){
            return zIndex++;
        },
        template: function(role){
            return UI_TEMPLATE[role].clone();
        },
        loadTemplate: function(url){
            return $.get(url, function(html){
                html = $("<div />").append(html);
                $("*[s-ui-role]", html).each(function(){
                    var node = $(this);
                    UI_TEMPLATE[node.attr("s-ui-role")] = node;
                });
            });
        },
        backdrop: (function(){

            var BACKDROP_ZINDEX_STACK = [];

            var backdrop;

            var isShown = false;

            return function(show){
                if(!backdrop){
                    backdrop = $(Smart.UI.template('backdrop')).clone();
                    backdrop.appendTo("body");
                }
                var deferred = $.Deferred();
                show = show == undefined ? true : show;
                if (show) {

                    var zIndex = Smart.UI.zIndex();
                    BACKDROP_ZINDEX_STACK.push(zIndex);

                    backdrop.show().css("z-index", zIndex);
                    if(isShown){
                        return deferred.resolve();
                    }

                    var callback = function(){
                        deferred.resolve();
                    };

                    isShown = true;

                    var doAnimate = $.support.transition;
                    if (doAnimate) backdrop[0].offsetWidth; // force reflow

                    backdrop.addClass('in');
                    doAnimate ?
                        backdrop
                            .one($.support.transition.end, callback)
                            .emulateTransitionEnd(150) :
                        callback()

                } else {
                    BACKDROP_ZINDEX_STACK.pop();
                    if(BACKDROP_ZINDEX_STACK.length){
                        backdrop.css("zIndex", BACKDROP_ZINDEX_STACK[BACKDROP_ZINDEX_STACK.length]);
                        return deferred.resolve();
                    }
                    var callback = function(){
                        backdrop.hide();
                        deferred.resolve();
                    };
                    isShown = false;
                    backdrop.removeClass('in');
                    $.support.transition ?
                        backdrop
                            .one($.support.transition.end, callback)
                            .emulateTransitionEnd(150) :
                        callback()

                }
                return deferred.promise();
            }
        })()
    };
})(jQuery);
;/**
 * Created by Administrator on 2014/6/21.
 */
(function(){
    Smart.UI.contextmenu = {
        target: null
    };

    var DISABLED_CLASS = "disabled";

    var CURRENT_SHOWN_CONTEXTMENU;

    Smart.widgetExtend({
        id: "contextmenu",
        options: "ctx:target,ctx:filter"
    },{
        onPrepare: function(){
            var target = this.options.contextmenu['target'];
            var that = this;
            if(target)
                this.bindTarget(target);
            this.node.delegate("li", "click", function(e){
                if($("ul", $(this)).size() > 0){
                    return;
                }
                that.hide();
                e.stopPropagation();
            });
            $(document).click(function(e){
                that.hide();
            });
            this.node.find("li ul").each(function(e){
                var ul = $(this);
                var parentLi = ul.parent();
                parentLi.mouseover(function(){
                    if($(this).hasClass(DISABLED_CLASS)){
                        return;
                    }
                    ul.css("z-index",Smart.UI.zIndex()).show().position({
                        of: parentLi,
                        my: "left top",
                        at: "right-3 top+3",
                        collision: "flip flip"
                    });
                });
                parentLi.mouseleave(function(){
                    ul.fadeOut();
                });
            });
        }
    },{
        bindTarget: function(node){
            var that = this;
            node.bind("contextmenu", function(e){
                that.show(e, $(this));
                return false;
            });
        },
        show: function(e, el){
            if(CURRENT_SHOWN_CONTEXTMENU && CURRENT_SHOWN_CONTEXTMENU != this){
                CURRENT_SHOWN_CONTEXTMENU.hide();
            }
            CURRENT_SHOWN_CONTEXTMENU = this;
            Smart.UI.contextmenu.target = Smart.of(el);
            //过滤菜单
            if(this.options.contextmenu.filter){
                var menuNodes = this.node.find("li[menuId]");
                var that = this;
                if(menuNodes.size()){
                    menuNodes.each(function(){
                        //如果filter的返回值是false，则说明该菜单不可用。
                        var node = $(this);
                        var menuId = node.attr("menuId");
                        if(that.options.contextmenu.filter(menuId, node) == false){
                            that._disableMenu(node);
                        } else {
                            that._enableMenu(node);
                        }
                    });
                }
            }
            $(this.node).show().css({
                zIndex:Smart.UI.zIndex(),
                position: "absolute"
            }).position({
                of: e,
                my: "left top",
                at: "left top",
                collision: "flip flip"
            });
        },
        hide: function(){
            this.node.fadeOut(200);
        },
        disableMenuById: function(id){
            this._disableMenu(this.node.find("li[menuId='"+id+"']"));
        },
        _disableMenu: function(menu){
            menu.addClass(DISABLED_CLASS);
            $("i, span", menu).click(function(e){
                e.stopPropagation();
            });
        },
        enableMenuById: function(id){
            this._enableMenu(this.node.find("li[menuId='"+id+"']"));
        },
        _enableMenu: function(menu){
            menu.removeClass(DISABLED_CLASS);
            $("i, span", menu).unbind("click");
        }
    });
})();;/**
 * Created by Administrator on 2014/6/27.
 */
(function($){
    var dropdown_val_attr = Smart.optionAttrName('dropdown', 'val');
    var dropdown_title_attr = Smart.optionAttrName('dropdown', 'title');
    var dropdown_title_selector = "*["+Smart.optionAttrName('dropdown','role')+"='title']";
    Smart.widgetExtend({
        id: "dropdown",
        options: "e,name,ctx:t",
        defaultOptions: {
            e: "request.data"
        }
    },{
        onPrepare: function(){
            var that = this;
            this.node.delegate("*["+dropdown_val_attr+"]", 'click', function(e){
                var val = $(this).attr(dropdown_val_attr);
                //如果配置了target，则把该值赋值给target
                if(that.options.dropdown.t){
                    that.options.dropdown.t.val(val);
                }
                if(that.options.dropdown.e){//如果配置了e，则发送该事件
                    var data = {};
                    if(that.options.dropdown['name'] == null){
                        data = val;
                    } else {
                        data[that.options.dropdown['name']] = val;
                    }
                    that.trigger(that.options.dropdown['e'], [data]);
                }
                var title = $(this).attr(dropdown_title_attr) || $(this).text();
                $(dropdown_title_selector, that.node).html(title);
            });
        }
    });
})(jQuery);
;/**
 * Created by Administrator on 2014/6/27.
 */
(function ($) {

    var paging = function (page, pageSize, totalCount, showSize) {
        showSize = showSize || 10;
        page = page < 1 ? 1 : page;
        var totalPage = Math.ceil(totalCount / pageSize);
        var startPage = page - Math.floor(showSize / 2);
        if (startPage < 1)
            startPage = 1;
        var endPage = startPage + showSize;
        if (endPage > totalPage) {
            endPage = totalPage;
            startPage = endPage - showSize;
            if (startPage < 1)
                startPage = 1;
        }
        var startPrePage = 0;
        if (startPage > 1)
            startPrePage = startPage - 1;
        var endNextPage = 0;
        if (endPage < totalPage)
            endNextPage = endPage + 1;
        var prePage = 0, nextPage = 0;
        if(page > 1) prePage = page - 1;
        if(page < totalPage) nextPage = page + 1;
        var startNum = (page - 1) * pageSize + 1;
        var endNum = startNum + pageSize - 1;
        if (endNum > totalCount)
            endNum = totalCount;
        return {
            page: page,
            pageSize: pageSize,
            totalCount: totalCount,
            startPage: startPage,
            endPage: endPage,
            startNum: startNum,
            endNum: endNum,
            startPrePage: startPrePage,
            endNextPage: endNextPage,
            prePage: prePage,
            nextPage: nextPage,
            totalPage: totalPage
        };
    };

    //分页控件
    Smart.widgetExtend({
        id: "pagination",
        options: "pagekey, pskey, totalkey, showsize, start-p, end-n, disabled-c, active-c, pre, next, event",
        defaultOptions: {
            'pagekey': "page",
            'pskey': "pageSize",
            'totalkey': "total",
            "showsize": 11,
            "start-p": "&laquo;",
            "end-n": "&raquo;",
            "pre": "‹",
            "next": "›",
            "disabled-c": "disabled",
            "active-c": "active",
            "event": "request.data",//页点击所触发的事件
            "ed-pk": "page"//event.data的page key
        }
    }, {
        onPrepare: function () {

        }
    }, {
        dataSetter: function (data) {
            var pi = paging(data[this.options.pagination['pagekey']],
                data[this.options.pagination['pskey']],
                data[this.options.pagination['totalkey']],
                data[this.options.pagination['showsize']]);
            this.node.empty();
            var startPreLi = this._createLi(this.options.pagination['start-p']);
            if (pi.startPrePage <= 0) {
                startPreLi.addClass(this.options.pagination['disabled-c']);
            } else {
                startPreLi.click(function () {
                    that._triggerPage(pi.startPrePage);
                });
            }
            this.node.append(startPreLi);
            var preLi = this._createLi(this.options.pagination.pre);
            if (pi.prePage <= 0) {
                preLi.addClass(this.options.pagination['disabled-c']);
            } else {
                preLi.click(function () {
                    that._triggerPage(pi.prePage);
                });
            }
            this.node.append(preLi);
            var that = this;
            for (var i = pi.startPage; i <= pi.endPage; i++) {
                (function (i) {
                    var pageLi = that._createLi(i);
                    if (i == pi.page) {
                        pageLi.addClass(that.options.pagination['active-c']);
                    } else {
                        pageLi.click(function () {
                            that._triggerPage(i);
                        });
                    }
                    that.node.append(pageLi);
                })(i);
            }
            var nextLi = this._createLi(this.options.pagination.next);
            if (pi.nextPage <= 0) {
                nextLi.addClass(this.options.pagination['disabled-c']);
            } else {
                nextLi.click(function () {
                    that._triggerPage(pi.nextPage);
                });
            }
            this.node.append(nextLi);
            var endNextLi = this._createLi(this.options.pagination['end-n']);
            if (pi.endNextPage <= pi.endPage) {
                endNextLi.addClass(this.options.pagination['disabled-c']);
            } else {
                endNextLi.click(function () {
                    that._triggerPage(pi.endNextPage);
                });
            }
            this.node.append(endNextLi);
        },
        _triggerPage: function(page){
            var arg = {};
            arg[this.options.pagination['ed-pk']] = page;
            this.trigger(this.options.pagination['event'], [arg]);
        },
        _createLi: function (txt) {
            var li = $("<li />");
            var a = $("<a href='javascript:;'>" + txt + "</a>");
            li.append(a);
            return li;
        }
    });
})(jQuery);
;/**
 * Created by Administrator on 2014/6/28.
 */
(function ($) {
    Smart.widgetExtend({
        id: "select",
        options: "form",
        defaultOptions: {
            form: "id:name,title"
        }
    }, {
        onPrepare: function () {
            var originalOptions = this.node.children();
            this.dataTable("select", "originalOptions", originalOptions);
            this.options.select.form = this.options.select.form.split(":");
            this.options.select.form[1] = this.options.select.form[1].split(",");
        }
    }, {
        build: function (datas) {
            if (!$.isArray(datas)) {
                Smart.error("构建select选项所需的数据必须是数组");
                return;
            }
            this.node.empty();
            this.node.append(this.dataTable("select", "originalOptions"));
            for (var i in datas) {
                this.node.append(this._createOption(datas[i]));
            }
        },
        _createOption: function (data) {

            var value = data[this.options.select.form[0]];
            var title = data[this.options.select.form[1][0]];
            if (!title && this.options.select.form[1].length == 2) {
                title = data[this.options.select.form[1][1]];
            }
            var option = $('<option value="' + value + '">' + title + '</option>');
            return option;
        }
    });
})(jQuery);;/**
 * Created by Administrator on 2014/6/28.
 */
(function($){
    //表单提交插件，作用于submit按钮，可以实现表单回车提交
    Smart.widgetExtend({id:"submit"}, {
        onPrepare: function(){
            var form = this.node.closest("form");
            if(form.size() == 0){
                return;
            }
            form[0].onsubmit = function(e){
                e.stopPropagation();
                return false;
            };

        }
    });
})(jQuery);;(function ($) {

    var DEFAULT_MSG = {};

    var VALID_NODE_ERROR_ATTR = Smart.optionAttrName("valid", "error");
    var VALID_NODE_LABEL_ATTR = Smart.optionAttrName("valid", "label");
    var VALID_NODE_WARNING_ATTR = Smart.optionAttrName("valid", "warning");
    var VALID_NODE_SELECTOR = "*[" + VALID_NODE_ERROR_ATTR + "]:not('disabled'),*["+VALID_NODE_WARNING_ATTR+"]:not('disabled')";
    var VALID_NODE_ID_ATTR = Smart.optionAttrName("valid", 'id');
    var VALID_NODE_SHOW_ATTR = Smart.optionAttrName("valid",'show');
    var VALID_NODE_BLUR_IG_ATTR = Smart.optionAttrName("valid", "blur-ig");

    var ITEM_ROLE_SELECTOR = "*["+Smart.optionAttrName("valid", "role")+"='item']";
    var MSG_ROLE_SELECTOR = "*["+Smart.optionAttrName("valid", "role")+"='msg']";

    var NODE_ORIGINAL_VALID_MSG_KEY = "s-valid-original-msg";

    var LEVELS = {
        success: {
            style: "s-class",
            key: "success"
        },
        warning: {
            style: "w-class",
            key: "warning"
        },
        error: {
            style: "e-class",
            key: "error"
        }
    };

    //验证控件
    Smart.widgetExtend({
        id: "valid",
        options: "ctx:msg,ctx:show,s-class,e-class,w-class,blur,ctx:validators",
        defaultOptions: {
            msg: DEFAULT_MSG,
            blur: true,
            's-class': "has-success",
            'e-class': "has-error",
            'w-class': "has-warning",
            'show': function(node, msg, level){
                level = level || LEVELS.error;
                var item = node.closest(ITEM_ROLE_SELECTOR);
                var msgNode = $(MSG_ROLE_SELECTOR,item);
                if(node.data(NODE_ORIGINAL_VALID_MSG_KEY) == undefined){
                    node.data(NODE_ORIGINAL_VALID_MSG_KEY, msgNode.html());
                }
                item.removeClass(this.options.valid['s-class']+" "+this.options.valid['e-class']+" "+this.options.valid['w-class']);
                item.addClass(this.options.valid[level.style]);
                $(MSG_ROLE_SELECTOR,item).html(msg || node.data(NODE_ORIGINAL_VALID_MSG_KEY) || "");
            }
        },
        addValidators: addValidators,//添加新的验证器
        setValidatorMsg: setValidatorMsg//修改验证器的msg提示

    }, {
        onPrepare: function () {
            if(this.options.valid.blur){
                var that = this;
                this.node.delegate(VALID_NODE_SELECTOR, "blur", function(){
                    if($(this).attr(VALID_NODE_BLUR_IG_ATTR) == "true"){
                        return;
                    }
                    that.validateNode($(this));
                });
            }
            if(this.options.valid.validators){
                var map = {};
                for(var i = 0; i < this.options.valid.validators.length; i++){
                    var v = this.options.valid.validators[i];
                    map[v.id] = v;
                }
                this.dataTable("valid", "validatorMap", map);
            }
            this.dataTable("valid", 'validateItemMap', {});
        }
    }, {
        validate: function () {
            var validNodes = this.node.find(VALID_NODE_SELECTOR);
            var deferreds = [];
            var that = this;
            validNodes.each(function(){
                var node = $(this);
                deferreds.push(function(){
                    return that.validateNode(node);
                });
            });
            return Smart.deferredQueue(deferreds);
        },
        validateNode: function (node) {
            var id = node.attr(VALID_NODE_ID_ATTR);
            var defMsg = this.options.valid.msg[id] || {};
            var errorExp = node.attr(VALID_NODE_ERROR_ATTR);
            var label = node.attr(VALID_NODE_LABEL_ATTR);
            var deferreds = [];
            var that = this;
            var show = node.attr(VALID_NODE_SHOW_ATTR);
            if(show){
                show = this.context(show);//shown是一个context闭包参数。
            }
            var validateItem = {
                id: id,
                label: label ? label : "",
                node: node,
                value: node.val()
            };
            var validateItemMap = this.dataTable("valid", 'validateItemMap');
            if(id != undefined){
                validateItemMap[id] = validateItem;
            }

            var msg = "";
            var level;

            if(errorExp){
                deferreds.push(function(){
                    var deferred = $.Deferred();
                    var errorDefMsg = defMsg['error'] || {};
                    executeExp(that, errorExp, errorDefMsg, validateItem, validateItemMap)
                        .done(function(result, _level){
                            msg = result;
                            level = _level || LEVELS.success;
                            deferred.resolve();
                        }).fail(function(result, _level){
                            level = _level || LEVELS.error;
                            (show || that.options.valid.show).call(that, node,  result || defMsg[level.key+"Msg"] || "", level);
                            deferred.reject();
                        });
                    return deferred;
                });
            }

            var warningExp = node.attr(VALID_NODE_WARNING_ATTR);
            if(warningExp){
                deferreds.push(function(){
                    var deferred = $.Deferred();
                    var warningMsg = defMsg['warning'] || {};
                    executeExp(that, warningExp, warningMsg, validateItem, validateItemMap).always(function(result, level){
                        msg = result;
                        deferred.resolve();
                    }).done(function(result, _level){
                        //warning级别的验证通过
                        level = _level || LEVELS.success;
                    }).fail(function(result, _level){
                        //warning级别的验证不通过
                        level = _level || LEVELS.warning;
                    });

                    return deferred;
                });
            }
            deferreds.push(function(){
                (show || that.options.valid.show).call(that, node, defMsg[level.key+"Msg"] || msg || "", level);
            });
            return Smart.deferredQueue(deferreds);
        }
    });

    /**
     * valid
     * */

    function Validation(smart, value, item ,itemMap) {
        this.varMap = {};
        this.item = item;
        this.value = value;
        this.smart = smart;
        this._interrupt = false;
        this._validateItemMap = itemMap;
    }

    Validation.prototype = {
        putVar: function (key, val) {
            this.varMap[key] = val;
        },
        getItemById: function(id){
            return this._validateItemMap[id];
        },
        processMsg: function (msg) {
            var placeholderRegex = /(\{.+?\})/g;
            var that = this;
            return msg.replace(placeholderRegex, function ($0) {
                var str = that.varMap[$0.substring(1, $0.length - 1)];
                return str != undefined ? str : "";
            });
        },
        interrupt: function(){//中断验证
            this._interrupt = true;
        },
        interrupted: function(){//是否中断
            return this._interrupt;
        }
    }

    //require:true,len(6,12),eq(ctx:S.N('#aaaaa').val())

    function executeExp(smart, exp, nodeMsg, item, validateItemMap) {
        var validSegs = getValidSegs(exp);
        var deferred = $.Deferred();
        var validMsg = "";
        var msgLevel = LEVELS.error
        function processMsg(validation, msg) {
            if (msg == null) {
                return ""
            }
            if(msg.indexOf('success:') == 0){//说明验证成功
                msgLevel = LEVELS['success'];
                msg = msg.substring(8);
            } else if(msg.indexOf('error:') == 0){//说明验证失败
                msgLevel = LEVELS.error;
                msg = msg.substring(6);
            } else if(msg.indexOf('warning:') == 0){
                msgLevel = LEVELS.warning;
                msg = msg.substring(8);
            } else {
                msgLevel = msgLevel || LEVELS.error;
            }
            validMsg = validation.processMsg(msg);
        }

        var optionValidatorMap = smart.dataTable("valid", "validatorMap") || {};

        var methodCount = {};

        function resolve(){
            return deferred.resolve(validMsg, msgLevel);
        }

        function reject(){
            return deferred.reject(validMsg, msgLevel);
        }

        function validate(i){
            if(i == validSegs.length){
                resolve();
                return;
            }
            var vs = validSegs[i];
            var s = /^(\w+)\((.*)\)$/g.exec(vs);
            var method = s[1];
            var validation = new Validation(smart, item.value, item ,validateItemMap);
            validation.putVar('label', item.label);
            var argStr = ".valid.call(validation";
            if (s.length == 3 && $.trim(s[2]) != "") {
                argStr += "," + s[2];
            }
            var validator = optionValidatorMap[method] || getValidator(method);
            if (validator) {
                var rs = eval("validator" + argStr + ")");


                /**
                 * 如果表达式中出现了多个相同的验证器，那么寻找msg的时候，就根据 验证器名称"#"当前计数 的组合去查找msg定义。
                 * 如：regex(/(?=.*[a-zA-Z])(?=.*[0-9])/g),regex(/(?=.*[A-Z])(?=.*[a-z])(?=.*\W)/g)
                 * 那么可以定义msg为：
                 * {
                        regex: {
                            '0': "密码强度弱"
                        },
                        'regex#1': {
                            '0': "密码强度中"
                        },
                        'regex#2': {
                            '1': "密码强度强"
                        }
                    },
                    然后 regex#0是第一个验证器的msg， regex#1是第二个验证器的msg，regex#3是第三个验证器的msg，
                 如果根据这样的规则找不到验证器，则根据验证器名称去寻找，即 regex去寻找。
                 * */
                var count = methodCount[method];
                if(count == undefined){
                    count = 0;
                } else {
                    count++;
                }
                methodCount[method] = count;//method计数
                var methodCountMsg = nodeMsg[method+"#"+count] || {};
                var methodMsg = nodeMsg[method] || {};
                var msg = methodCountMsg.msg || methodMsg.msg || "";

                //默认的success code 是 1
                var successCode = methodCountMsg.successCode || methodMsg.successCode || "1";

                msg = $.extend($.extend({}, validator.msg), msg);

                function processSuccess(msgStr){
                    msgLevel = LEVELS.success;
                    processMsg(validation, msgStr || msg[successCode]);
                    //如果验证成功，并且不继续往下验证，则中断验证。
                    if(validation.interrupted()){
                        resolve();
                        return;
                    }
                    validate(i+1);
                }

                if (rs == successCode) {
                    processSuccess();
                    return;
                } else if ($.type(rs) == "object" && 'done' in rs) {
                    rs.done(function (code, _msg) {
                        if (code == successCode) {
                            processSuccess(_msg);
                        } else {
                            processMsg(validation,  _msg || msg[code]);//这里只显示错误提示
                            //处理msg消息
                            reject();
                        }
                    });
                } else {
                    msgLevel = LEVELS.error;
                    processMsg(validation,  msg[rs]);
                    return reject();
                }
            } else {
                msgLevel = LEVELS.error;
                return reject();
            }
        }

        validate(0);
        return deferred.promise();
    }

    function getValidSegs(exp) {
        var validSegs = [];
        var inBraces = 0;
        var cache = [];
        for (var i = 0; i < exp.length; i++) {
            var char = exp[i];
            if (char == "," && inBraces == 0) {
                validSegs.push(cache.join(""));
                cache = [];
                continue;
            }
            if (char == "(" && !inBraces) {
                inBraces++;
            }
            if (char == ")" && inBraces) {
                inBraces--;
            }
            cache.push(char);
        }
        validSegs.push(cache.join(""));
        return validSegs;
    }

    var validatorMap = {};

    function addValidators(validators) {
        if (!$.isArray(validators)) {
            validators = [validators];
        }
        for (var i in validators) {
            var validtor = validators[i];
            addValidator(validtor);
        }
    }

    function setValidatorMsg(defs){
        if(!$.isArray(defs)){
            defs = [defs];
        }
        $.each(defs, function(i, def){
            var validator = validatorMap[def.id];
            if(!validator) return;
            validator.msg = $.extend(validator.msg || {}, def.msg);
        });
    }

    function addValidator(validator) {
        validatorMap[validator.id] = validator;
    }

    function getValidator(id) {
        return validatorMap[id];
    }

    addValidators([
        {
            id: "require",
            valid: function (flag) {
                flag = flag == undefined ? true : flag;
                if (flag && Smart.isEmpty(this.value)) {
                    return 0;
                }
                if(!flag && Smart.isEmpty(this.value)){
                    //如果不是必须的，并且验证的值为空，则中断验证，返回1
                    this.interrupt();//中断后续的验证
                    return 1;//验证通过
                }
                return 1;
            },
            msg: {
                '0': "{label}不能为空"
            }
        },
        {
            id: "remote",//远程验证
            valid: function (url, codeKey, msgKey) {
                var deferred = $.Deferred();
                url = url.replace("{val}", this.value);
                this.smart.get(url, null, null, {silent:true}).done(function(rs){
                    var code,msgStr;
                    if($.type(rs) == "object"){
                        code = rs[codeKey || "code"];
                        msgStr = rs[msgKey || "msg"];
                    } else {
                        code = rs;
                    }
                    deferred.resolve(code, msgStr);
                });
                return deferred.promise();
            },
            msg: {
                '0': "验证不通过"
            }
        },
        {
            id: "email",
            valid: (function () {
                var emailRegex = /^[a-z]([a-z0-9]*[-_]?[a-z0-9]+)*@([a-z0-9]*[-_]?[a-z0-9]+)+[\.][a-z]{2,3}([\.][a-z]{2})?$/i;
                return function () {
                    if (emailRegex.test(this.value))
                        return 1;
                    return 0;
                }
            })(),
            msg: {
                '0': "{label|Email}输入格式不正确"
            }
        },
        {
            id: "regex",
            valid: function (regex) {
                if (regex.test(this.value))
                    return 1;
                return 0;
            },
            msg: {
                '0': "{label}输入格式不正确"
            }
        },
        {
            id: "checked",
            valid: function(){
                if(this.item.node.prop("checked")){
                    return 1;
                }
                return 0;
            }
        },
        {
            id: "len",
            valid: function (min_len, max_len) {
                var val = $.trim(this.value);
                if (!max_len) {//如果max_len为空，则表示长度只能是min_len的长度。
                    if (val.length != min_len) {
                        this.putVar("len", min_len);
                        return -1;
                    }
                } else {
                    if (val.length < min_len) {
                        this.putVar("min_len", min_len);
                        return -2;
                    }
                    if (val.length > max_len) {
                        this.putVar("max_len", max_len);
                        return -3;
                    }
                }
                return 1;
            },
            msg: {
                "-1": "{label}长度必须为{len}位",
                "-2": "{label}长度不能小于{min_len}位",
                "-3": "{label}长度不能大于{max_len}位"
            }
        },
        {
            id: "range",
            valid: function (min, max) {
                if (this.value < min) {
                    this.putVar("min", min);
                    return -1;
                }
                if (this.value > max) {
                    this.putVar("max", max);
                    return -2;
                }
                return 1;
            },
            msg: {
                "-1": "{label}不能小于{min}",
                "-2": "{label}不能大于{max}"
            }
        },
        {
            id: "word",
            valid: (function () {
                var regex = /^[A-Za-z0-9_\-]*$/;
                return function () {
                    if (regex.test(this.value))
                        return 1;
                    return 0;
                }
            })(),
            msg: {
                '0': "{label}只能是字母、数字、下划线、中划线的组合"
            }
        },
        {
            id: "words",
            valid: (function () {
                var regex = /^[A-Za-z0-9_\-\s]*$/;
                return function () {
                    if (regex.test(this.value))
                        return 1;
                    return 0;
                }
            })(),
            msg: {
                '0': "{label}只能是字母、数字、下划线、中划线、空格的组合"
            }
        },
        {
            id: "non_char",
            valid: function (chars) {
                if (!chars)
                    return 1;
                for (var i = 0; i < chars.length; i++) {
                    if (this.value.indexOf(chars[i]) != -1) {
                        this.putVar("char", chars[i]);
                        return 0;
                    }
                }
                return 1;
            },
            msg: {
                '0': "{label}中不能包含{char}字符"
            }
        },
        {
            id: "eq",
            valid: function (id) {
                var item = this.getItemById(id);
                if(item == undefined){
                    return -1;
                }
                if (this.value != item.value) {
                    this.putVar("t_label", item.label);
                    return 0;
                }
                return 1;
            },
            msg: {
                '1': "{label}输入正确",
                '0': "{label}与{t_label}输入不一致",
                '-1': "未找到比较的对象"
            }
        },
        {
            id: "number",
            valid: function () {
                if (!isNaN(this.value))
                    return 1;
                return 0;
            },
            msg: {
                '0': "{label}只能输入数字"
            }
        },
        {
            id: "ip",
            valid: (function () {
                var regex = /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;
                return function () {
                    if (regex.test(this.value))
                        return 1;
                    return 0;
                }
            })(),
            msg: {
                '0': "{label|ip}格式输入不正确"
            }
        },
        {
            id: "url",
            valid: (function () {
                var regex = "^((https|http|ftp|rtsp|mms)?://)"
                    + "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" //ftp的user@
                    + "(([0-9]{1,3}\.){3}[0-9]{1,3}" // IP形式的URL- 199.194.52.184
                    + "|" // 允许IP和DOMAIN（域名）
                    + "([0-9a-z_!~*'()-]+\.)*" // 域名- www.
                    + "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\." // 二级域名
                    + "[a-z]{2,6})" // first level domain- .com or .museum
                    + "(:[0-9]{1,4})?" // 端口- :80
                    + "((/?)|" // a slash isn't require if there is no file label
                    + "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";
                return function () {
                    var re = new RegExp(regex);
                    if (re.test(this.value))
                        return 1;
                    return 0;
                }
            })(),
            msg: {
                '0': "{label|url}格式输入不正确"
            }
        }
    ]);
//    var exp = "require(),len(6,12),word(),remote('http://www.1234.com/aaa/{val}')";
//    executeExp(exp, 'luling1028', '用户名').done(function (msg) {
//        console.info(msg);
//    }).fail(function (msg) {
//        console.info(msg);
//    });
})(jQuery);;(function(){
    var ALERT_LEVEL = {
        warning: {
            sign: "glyphicon glyphicon-exclamation-sign",
            color: "text-warning"
        },
        info: {
            sign: "glyphicon glyphicon-info-sign",
            color: "text-info"
        },
        success: {
            sign: "glyphicon glyphicon-ok-sign",
            color: "text-success"
        },
        danger: {
            sign: "glyphicon glyphicon-remove-sign",
            color: "text-danger"
        }
    };
    var DEFAULT_LEVEL = ALERT_LEVEL.info;
    var DEFAULT_OPTION = {title : "提示", btnName: "确定"};
    Smart.extend(Smart.prototype, {
        alert: function(msg, level, option){
            var deferred = $.Deferred();
            var dialog = Smart.UI.template("alert");
            var alertLevel = ALERT_LEVEL[level] || DEFAULT_LEVEL;
            option = option || DEFAULT_OPTION;
            if($.type(option) == "string"){
                option = $.extend($.extend({}, DEFAULT_OPTION), {title: option});
            }
            $("*[s-ui-alert-role='title']", dialog).html(option.title);
            $("*[s-ui-alert-role='message']", dialog).html(msg);
            $("*[s-ui-alert-role='sign']", dialog).addClass(alertLevel.color).addClass(alertLevel.sign);
            var btn = $("*[s-ui-alert-role='btn']", dialog);
            btn.html(option.btnName);
            Smart.UI.backdrop();
            $(dialog).on("hide.bs.modal", function(){
                Smart.UI.backdrop(false).done(function(){
                    deferred.resolve();
                });
            }).on("hidden.bs.modal", function(){
                $(this).remove();
            }).on('shown.bs.modal', function(){
                btn.focus();
            }).css('zIndex', Smart.UI.zIndex()).modal({
                keyboard: false,
                backdrop: false
            });

            return deferred;
        }
    });
})();;/**
 * Created by Administrator on 2014/6/26.
 */
(function ($) {

    var ALERT_LEVEL = {
        warning: {
            sign: "glyphicon glyphicon-exclamation-sign",
            color: "text-warning"
        },
        info: {
            sign: "glyphicon glyphicon-info-sign",
            color: "text-info"
        },
        success: {
            sign: "glyphicon glyphicon-ok-sign",
            color: "text-success"
        },
        danger: {
            sign: "glyphicon glyphicon-remove-sign",
            color: "text-danger"
        }
    };
    var DEFAULT_LEVEL = ALERT_LEVEL.warning;
    var DEFAULT_OPTION = {title: "提示", sureBtnName: "确定", cancelBtnName: "取消", sign: "info"};

    Smart.fn.extend({
        confirm: function (msg, option) {
            var deferred = $.Deferred();
            var dialog = Smart.UI.template("confirm");
            option = option || DEFAULT_OPTION;
            if ($.type(option) == "string") {
                option = $.extend($.extend({}, DEFAULT_OPTION), {sign: option});
            }
            var confirmLevel = ALERT_LEVEL[option.sign] || DEFAULT_LEVEL;

            $("*[s-ui-confirm-role='title']", dialog).html(option.title);
            $("*[s-ui-confirm-role='message']", dialog).html(msg);
            $("*[s-ui-confirm-role='sign']", dialog).addClass(confirmLevel.color).addClass(confirmLevel.sign);
            var sureBtn = $("*[s-ui-confirm-role='sureBtn']", dialog).html(confirmLevel.sureBtnName);
            var cancelBtn = $("*[s-ui-confirm-role='cancelBtn']", dialog).html(confirmLevel.cancelBtnName);
            Smart.UI.backdrop();
            var selectVal = 0;
            sureBtn.click(function () {
                selectVal = 1;
                dialog.modal('hide');
            });
            cancelBtn.click(function () {
                selectVal = 0;
                dialog.modal('hide');
            });
            $(dialog).on("hide.bs.modal", function () {
                Smart.UI.backdrop(false).done(function () {
                    deferred[selectVal ? 'resolve' : 'reject']();
                });
            }).on("hidden.bs.modal", function () {
                $(this).remove();
            }).css('zIndex', Smart.UI.zIndex()).modal({
                keyboard: false,
                backdrop: false
            });

            return deferred;
        }
    });
})(jQuery);;/**
 * Created by Administrator on 2014/6/25.
 */
(function ($) {
    /**
     * btn的定义
     * {
     *      id: "",
     *      name: "",
     *      click: function(){},
     *      style: "",
     *      icon: ""
     * }
     * */
    var DIALOG_DEFAULT_TITLE = "对话框";

    var createBtn = function(btn){
        var button = $('<button class="btn" type="button"></button>');
        btn.id && button.attr("s-ui-dialog-btn-id", btn.id);
        var text = (btn.icon ? "<i style='"+btn.icon+"'></i>" : "") + btn.name;
        button.html(text);
        btn.style && button.addClass(btn.style || "btn-default");
        button.click(btn.click);
        return button;
    };

    var showDialog = function(dialog){
        Smart.UI.backdrop();
        dialog.on("hide.bs.modal", function(){
            Smart.UI.backdrop(false);
        }).css('zIndex', Smart.UI.zIndex()).modal({
            keyboard: false,
            backdrop: false
        });
    };

    Smart.fn.extend({
        dialogOpen: function () {
            var deferred = $.Deferred();
            var dialog = Smart.UI.template("dialog");
            var node = $("<div s='window' />");
            var nodeSmart = Smart.of(node);
            var bodyNode = $("*[s-ui-dialog-role='body']", dialog);
            var bodySmart = Smart.of(bodyNode);
            var titleNode = $("*[s-ui-dialog-role='title']", dialog);
            var footerNode = $("*[s-ui-dialog-role='footer']", dialog);
            var closeBtn = $("*[s-ui-dialog-role='close']", dialog);
            var dialogMain = $("*[s-ui-dialog-role='dialog']", dialog);

            bodySmart.setNode(node);

            closeBtn.click(function(){
                nodeSmart.closeWithConfirm();
            });

            nodeSmart.on("close", function(e){
                var eDeferred = e.deferred;
                var args = Smart.SLICE.call(arguments, 1);
                dialog.on("hidden.bs.modal", function(){
                    eDeferred.resolve();
                    dialog.remove();
                    deferred.resolve.apply(deferred, args);
                });
                dialog.modal('hide');
                e.deferred = eDeferred.promise();
            }).on("load", function(){
                titleNode.html(nodeSmart.meta.title || DIALOG_DEFAULT_TITLE);
                if(nodeSmart.meta.btns){
                    $.each(nodeSmart.meta.btns, function(i, btn){
                        footerNode.append(createBtn(btn));
                    });
                }

                nodeSmart.meta.height && node.height(nodeSmart.meta.height);
                nodeSmart.meta.width && node.width(nodeSmart.meta.width);
                //这里主要处理内容的高度
                dialogMain.css("position","absolute");
                dialog.appendTo("body");
                dialogMain.width(dialog.innerHeight()).css("position","relative");

                showDialog(dialog);
            }).on("button.disabled", function(e, id){
                getButtonById(id).prop("disabled", true);
            }).on("button.enabled", function(e, id){
                getButtonById(id).prop("disabled", false);
            });

            function getButtonById(id){
                return $("button[s-ui-dialog-btn-id='"+id+"']", footerNode);
            }

            nodeSmart.load.apply(nodeSmart, $.makeArray(arguments));

            return deferred;
        }
    });
})(jQuery);
;/**
 * Created by Administrator on 2014/7/2.
 */
(function(){

    var uploadListener = {

        setTarget: function(node){
            this.node = node;
        },
        onBegin: function(){
            this.progress = Smart.UI.template("progress")
                .css({
                    "position": "absolute",
                    zIndex: Smart.UI.zIndex()
                }).addClass("s-ui-upload-progressbar");
            this.progress.width(this.node.innerWidth());
            this.progress.appendTo("body");
            this.progressbar = this.progress.children();
        },
        onProgress: function(percent, total, loaded){
            this.progress.position({
                of: this.node,
                at: "left bottom+5",
                my: "left top"
            });
            this.progressbar.width(percent+"%");
        },
        onDone: function(){
            var that = this;
            setTimeout(function(){
                that.progress.fadeOut(function(){$(this).remove();});
            }, 1500);
        }
    };

    Smart.extend({
        uploadSetting: function(setting){
            setting = setting || {};
            if(setting.listener) uploadListener = setting.listener;
        }
    });

    //上传文件
    Smart.fn.extend({
        "upload": function(url, fileNode, listener){
            var formData = Smart.formData(fileNode);
            listener = listener || uploadListener;
            if($.isFunction(listener)){
                listener = {
                    onProgress: listener
                };
            }
            listener.setTarget && listener.setTarget(fileNode);
            listener.onBegin && listener.onBegin();
            return this.post(url, formData, null, null, {
                xhr: function(){
                    var xhr = $.ajaxSettings.xhr();
                    xhr.upload.addEventListener("progress", function(e){
                        if (e.lengthComputable) {
                            var percentComplete = e.loaded * 100 / e.total;
                            listener.onProgress(percentComplete, e.total, e.loaded);
                        }
                    }, false);
                    return xhr;
                }
            }).always(function(){
                listener.onDone && listener.onDone();
            });

        }
    });

})();