(function($) {
	"use strict";

	var defaults = {
		dateFormat: "yy-mm-dd"
	},
		debugMode = false;

	function warn(msg) {
		console.log("warn: " + msg);
	}
	function error(msg) {
		console.log("error: " + msg);
	}

	function debug(msg, obj) {
		if (debugMode) {
			if (obj) {
				msg += msg + JSON.stringify(obj);
			}
			console.log("debug: " + msg);
		}
	}

	(function addValidateMethods() {
		//全角ひらがなのみ
		$.validator.addMethod("hiragana", function(value, element) {
			return this.optional(element) || /^([ぁ-んー]+)$/.test(value);
		}, "Please enter only Hiragana.");

		//全角カタカナのみ
		$.validator.addMethod("katakana", function(value, element) {
			return this.optional(element) || /^([ァ-ヶー]+)$/.test(value);
		}, "Please enter only Katakana.");

		//半角カタカナのみ
		$.validator.addMethod("hankana", function(value, element) {
			return this.optional(element) || /^([ｧ-ﾝﾞﾟ]+)$/.test(value);
		}, "Please enter only hankaku kana.");

		//半角アルファベット（大文字･小文字）のみ
		$.validator.addMethod("alpha", function(value, element) {
			return this.optional(element) || /^([a-zA-z¥s]+)$/.test(value);
		}, "Please enter only alphabet.");

		//半角アルファベット（大文字･小文字）もしくは数字のみ
		$.validator.addMethod("alphanum", function(value, element) {
			return this.optional(element) || /^([a-zA-Z0-9]+)$/.test(value);
		}, "Please enter only alphabet or number.");
		
		//郵便番号（例:012-3456）
		$.validator.addMethod("postcode", function(value, element) {
			return this.optional(element) || /^¥d{3}¥-¥d{4}$/.test(value);
		}, "Please enter a valid postcode.");

		//電話番号（例:010-2345-6789）
		$.validator.addMethod("tel", function(value, element) {
			return this.optional(element) || /^[0-9-]{10,13}$/.test(value);
		}, "Please enter a valid telephone number.");
		
		//正規表現
		$.validator.addMethod("regexp", function(value, element, param) {
			return this.optional(element) || new RegExp(param).test(value);
		}, "Please enter \"{0}\" format.");
		
		//複数項目のいずれかが必須
		$.validator.messages.requiredOne = "At least onf of {0} is required.";
	})();

	function Evaluator(context) {
		function evaluateError(obj) {
			throw "Invalid definition: " + JSON.stringify(obj);
		}
		function term(obj) {
			debug("term1: ", obj);
			var name = obj.name, 
				op = obj.op || "==", 
				value = obj.value;
			debug("term2: " + name + ", " + op + ", " + value);
			if (!context.getId(name)) {
				evaluateError(obj);
			}
			var target = context.getValue(name);
			switch (op) {
				case "=":
				case "==":
					return target == value;
				case ">":
					return target > value;
				case ">=":
					return target >= value;
				case "<":
					return target < value;
				case "<=":
					return target <= value;
				case "!=":
				case "<>":
					if (value) {
						return target != value;
					} else {
						return !!target;
					}
				default:
					evaluateError(obj);
			}
		}
		function composite(bAnd, cond) {
			debug("composite1: " + bAnd + ", ", cond);
			for (var i=0; i<cond.length; i++) {
				var obj = cond[i],
					ret = null;
				if (obj.op && obj.cond) {
					if (obj.op == "&&") {
						ret = composite(true, obj.cond);
					} else if (obj.op == "||") {
						ret =composite(false, obj.cond);
					}
				} else if (obj.op && obj.name) {
					ret = term(obj);
				}
				debug("composite2: " + ret);
				if (ret === null) {
					evaluateError(obj);
				} else if (bAnd) {
					if (!ret) {
						return false;
					}
				} else if (ret) {
					return true;
				}
			}
			return bAnd;
		}
		function evaluate(expr) {
			var ret = composite(expr.op == "&&", expr.cond);
			debug("evaluate: " + ret);
			return ret;
		}
		this.evaluate = evaluate;
	}
	function ExprParser() {
		
		function skipWhitespace(str, idx) {
			var len = str.length;
			while (idx < len) {
				var c = str.charAt(idx);
				if (c == ' ' || c == '\t') {
					idx++;
				} else {
					return idx;
				}
			}
			return idx;
		}
		function parseName(str, idx) {
			var len = str.length;
			while (idx < len) {
				var c = str.charAt(idx);
				switch (c) {
					case '>':
					case '<':
					case '!':
					case '=':
					case ' ':
					case '\t':
						return idx;
				}
				idx++;
			}
			throw idx;
		}
		function parseComparisionOp(str, idx) {
			var c1 = str.charAt(idx);
			var c2 = str.charAt(idx + 1);
			
			switch (c1) {
				case '>':
				case '<':
					if (c2 == '=' || (c1 == '<' && c2 =='>')) {
						return idx + 2;
					} else {
						return idx + 1;
					}
				case '=':
				case '!':
					if (c2 != '=') {
						throw idx + 1;
					}
					return idx + 2;
				default:
					throw idx;
			}
		}
		function parseValue(str, idx) {
			return str.length;
		}
		function parseTerm(str) {
			var spos = 0, idx = 0,
				name = null,
				op = null,
				value = null;
			
			try {
				spos = skipWhitespace(str, spos);
				idx = parseName(str, spos);
				name = str.substring(spos, idx);
				
				spos = skipWhitespace(str, idx);
				idx = parseComparisionOp(str, spos);
				op = str.substring(spos, idx);
				
				spos = skipWhitespace(str, idx);
				idx = parseValue(str, spos);
				value = str.substring(spos, idx).trim();
				
				if (op == "==" && value == "*") {
					op = "!=";
					value = "";
				}
				return {
					name: name,
					op: op,
					value: value
				}
			} catch (idx) {
				throw "Invalid expr: " + str + ", index=" + idx;
			}
		}
		function parse(str) {
			var andArray = str.split("&&"),
				orArray = str.split("||"),
				logicalOp = "&&",
				cond = [];
			
			if (andArray.length > 1 && orArray.length > 1) {
				throw "Can not use both of '&&' and '||'";
			} else if (orArray.length > 1) {
				logicalOp = "||";
				for (var i=0; i<orArray.length; i++) {
					cond.push(parseTerm(orArray[i]));
				}
			} else {
				for (var i=0; i<andArray.length; i++) {
					cond.push(parseTerm(andArray[i]));
				}
			}
			return {
				op: logicalOp,
				cond: cond
			}
		}
		$.extend(this, {
			"parse" : parse
		});
	}

	/*
	options - Settings for formbuilder.
	  dateFormat - Format for date type field.
	  labelWidth - Width for field label
	  rules - rules for relational items
	  validateOptions - Options for jquery.validate
	resources - Localized messages for labels and messages.
	*/
	$.fn.formbuilder = function(options, resources) {
		var $form = $(this).addClass("formbuilder-form"),
			$fieldset = $("<fieldset/>"),
			$ul = $("<ul/>"),
			rules = {},
			idPrefix = options.idPrefix || "",
			validateOptions = $.extend(true, {
				"messages" : {}
			}, options.validateOptions),
			validator = null;
		
		if (options.debug) {
			debugMode = true;
		}
		if (!validateOptions.errorPlacement) {
			validateOptions.errorPlacement = errorPlacement;
		}
		if (options.title) {
			$("<legend/>").text(options.title).appendTo($fieldset);
		}
		$fieldset.append($ul);
		$form.prepend($fieldset);
		
		//Context for user defined function
		var context = {
			getId: function(name) {
				return $form.find(":input[name=" + name + "]").attr("id");
			},
			getValue: function(name) {
				var $input = $form.find(":input[name=" + name + "]");
				if ($input.length == 0) {
					return null;
				}
				switch ($input.attr("type")) {
					case "checkbox":
					case "radio":
						var $checked = $input.filter(":checked");
						if ($checked.length == 1) {
							return $checked.val();
						} else if ($checked.length > 1) {
							var ret = [];
							$checked.each(function() {
								ret.push($(this).val());
							});
							return ret;
						} else {
							return null;
						}
					default:
						return $input.val();
				}
			},
			isEmpty: function(name) {
				return !this.getValue(name);
			},
			isChecked: function(name, value) {
				if (value) {
					var checked = this.gtValue(name);
					if ($.isArray(checked)) {
						$.inArray(value, checked);
					} else {
						return checked == value;
					}
				} else {
					return !this.isEmpty(name);
				}
			},
			getLabel: function(name) {
				if (!options.items || !options.items[name]) {
					return name;
				}
				var ret = options.items[name].label;
				if (ret.indexOf("<") != -1) {
					ret = ret.substring(0, ret.indexOf("<"));
				}
				return ret;
			}
		};
		function getValidateOptionsHolder(key) {
			if (!validateOptions[key]) {
				validateOptions[key] = {};
			}
			return validateOptions[key];
		}
		function parseExpr(expr) {
			try {
				var ret = new ExprParser().parse(expr);
				debug("parseExpr: ", ret);
				return ret;
			} catch (e) {
				error(e);
				throw e;
			}
		}
		function normalizeExpr(expr) {
			if (typeof(expr) == "string") {
				expr = parseExpr(expr);
			}
			if ($.isArray(expr)) {
				return {
					"op" : "&&",
					"cond" : expr
				}
			} else if (expr.op && expr.cond) {
				return expr;
			} else {
				return {
					"op" : "&&",
					"cond" : [expr]
				}
			}
		}
		function requiredIf(expr) {
			try {
				return new Evaluator(context).evaluate(expr);
			} catch (e) {
				error(e);
				return false;
			}
		}
		function getId(type, key) {
			if (idPrefix) {
				return idPrefix + "-" + type + "-" + key;
			} else {
				return type + "-" + key;
			}
		}
		function valueKind(key) {
			switch (key) {
				case "type" :
				case "label":
				case "values":
				case "rules":
				case "attrs":
				case "salesforce":
				case "selected":
				case "checked":
				case "helpText":
					return "top";
				case "class":
				case "value":
				case "size":
				case "multiple":
				case "disabled":
				case "rows":
				case "cols":
				case "autocomplete":
				case "list":
				case "placeholder":
				case "title":
					return "attrs";
				case "requiredIf":
					return "rules";
			}
			if (key.indexOf("data-") == 0) {
				return "attrs";
			}
			for (var name in $.validator.methods) {
				if (name == key) {
					return "rules";
				}
			}
			return "top";
		}
		function mayStringRule(key) {
			switch (key) {
				case "equalTo":
				case "accept":
				case "extension":
				case "requiredIf":
				case "min":
				case "max":
				case "regexp":
					return true;
				default:
					return false;
			}
		}
		
		function errorPlacement(label, element) {
			var li = element.parents("li").get(0);
			try {
				if (options.errorBreak) {
					var w = $(li).find("label:first").outerWidth() + 10;
					$(label).css({
						"display": "block",
						"padding-left" : w
					});
				}
			} catch (e) {
				console.log(e);
			}
			$(li).append(label);
		}
		function addValidateMessage(key, name, msg) {
			debug("addValidateMessage: key=" + key + ", name=" + name + ", msg=", msg);
			if (!validateOptions.messages[key]) {
				validateOptions.messages[key] = {};
			}
			validateOptions.messages[key][name] = msg;
		}
		function normalizeItem(key, values) {
			if (!values.label) {
				values.label = key;
			}
			if (!values.type) {
				values.type = "text";
			}
			if (!values.rules) {
				values.rules = {};
			}
			if (!values.attrs) {
				values.attrs = {};
			}
			for (var prop in values) {
				var kind = valueKind(prop);
				if (kind != "top") {
					values[kind][prop] = values[prop];
					delete values[prop];
				}
			}
			normalizeRules(key, values.rules);
		}
		function normalizeRules(key, rules) {
			$.each(rules, function(name, value) {
				if (typeof(value) == "object") {
					if (value.message) {
						addValidateMessage(key, name == "requiredIf" ? "required" : name, value.message);
						delete value.message;
					}
					if (value.value && Object.keys(value).length == 1) {
						rules[name] = value.value;
						value = value.value;
					}
				}
				if (typeof(value) == "string") {
					if (!mayStringRule(name)) {
						addValidateMessage(key, name, value);
						rules[name] = true;
					}
				}
			});
			if (rules.equalTo) {
				var value = rules.equalTo;
				if (value.length > 0 && value.charAt(0) == "#") {
					value = value.substring(1);
				}
				rules.equalTo = "#" + getId("input", value)
			}
			if (rules.requiredIf) {
				if ($.isFunction(rules.requiredIf)) {
					var func = rules.requiredIf;
					delete rules.requiredIf;
					rules.required = function() {
						return func(context);
					}
				} else {
					var expr = normalizeExpr(rules.requiredIf);
					delete rules.requiredIf;
					rules.required = function() {
						return requiredIf(expr);
					}
				}
			}
		}
		function normalizeOptions(options) {
			var ret = [];
			for (var i=0; i<options.length; i++) {
				var op = options[i];
				
				if (typeof(op) == "object") {
					if (!op.text) {
						op.text = op.value;
					}
					ret.push(op);
				} else {
					op = "" + op;
					var idx = op.indexOf(":"),
						text = null,
						value = null;
					if (idx == -1) {
						value = op;
						text = op;
					} else {
						value = op.substring(0, idx);
						text = op.substring(idx+1);
					}
					ret.push({
						value: value,
						text: text
					});
				}
			}
			return ret;
		}
		function setSelected($el, values, attr) {
			var array = ("" + values).split(",");
			$el.each(function() {
				var value = $(this).attr("value");
				for (var i=0; i<array.length; i++) {
					if (value == array[i]) {
						$(this).attr(attr, attr);
						break;
					}
				}
			});
		}
		function buildSelect($select, options) {
			options = normalizeOptions(options);
			var $group = null;
			for (var i=0; i<options.length; i++) {
				var op = options[i],
					$op = $("<option/>");
				$op.attr("value", op.value);
				$op.text(op.text);
				if (op.selected) {
					$op.attr("selected", "selected");
				}
				if (op.disabled) {
					$op.attr("disabled", "disabled");
				}
				if (op.group) {
					if ($group == null || $group.attr("label") != op.group) {
						$group = $("<optGroup/>");
						$group.attr("label", op.group);
						$select.append($group);
					}
				}
				if ($group) {
					$group.append($op);
				} else {
					$select.append($op);
				}
			}
		}
		function buildCheckboxOrRadio(key, type, options) {
			options = normalizeOptions(options);
			var $span = $("<span style='display:inline-block;'/>");
			for (var i=0; i<options.length; i++) {
				var op = options[i],
					$input = $("<input/>");
				$input.attr({
					name: key,
					id: getId("input", key) + "-" + op.value,
					type : type,
					value : op.value
				});
				if (op.checked) {
					$input.attr("checked", "checked");
				}
				if (op.disabled) {
					$input.attr("disabled", "disabled");
				}
				if (op["break"]) {
					$span.append("<br/>");
				}
				$span.append($input);
				if (op.text) {
					var $label = $("<label/>");
					$label.html(op.text);
					$span.append($label);
				}
			}
			return $span;
		}
		function setAttrs($input, attrs) {
			for (var prop in attrs) {
				var value = attrs[prop];
				if (prop == "class") {
					$input.addClass(value);
				} else if (prop == "value") {
					$input.val(value);
				} else {
					$input.attr(prop, value);
				}
			}
			if (options.tooltip && attrs.title) {
				$input.tooltip();
			}
		}
		function buildForm(key, values) {
			if (typeof(values) === "string") {
				values = {
					type : values
				}
			}
			normalizeItem(key, values);
			var type = values.type,
				$input = null,
				$target = null;
			
			switch (type) {
				case "text":
				case "password":
				case "hidden":
				case "file":
					$input = $("<input/>");
					$input.attr({
						name: key,
						id: getId("input", key),
						type: type
					})
					setAttrs($input, values.attrs);
					break;
				case "date":
					$input = $("<input/>");
					$input.attr({
						name: key,
						id: getId("input", key),
						type: "text"
					})
					setAttrs($input, values.attrs);
					var dateOptions = {
						dateFormat: options.dateFormat || defaults.dateFormat,
						onSelect: function() {
							if (validator) {
								validator.element("#" + context.getId(key));
							}
						}
					}
					if (values.rules.min) {
						dateOptions.minDate = values.rules.min;
					}
					if (values.rules.max) {
						dateOptions.maxDate = values.rules.max;
					}
					
					$input.datepicker(dateOptions);
					values.rules.date = true;
					break;
				case "checkbox":
				case "radio":
					if (!values.values) {
						values.values = ["true:"];
					}
					$target = buildCheckboxOrRadio(key, type, values.values);
					$input = $target.find("input");
					setAttrs($input, values.attrs);
					if (values.checked) {
						setSelected($input, values.checked, "checked");
					}
					break;
				case "select":
					$input = $("<select/>");
					$input.attr({
						name: key,
						id: getId("input", key)
					});
					setAttrs($input, values.attrs);
					buildSelect($input, values.values);
					if (values.selected) {
						setSelected($input.find("option"), values.selected, "selected");
					}
					break;
				case "textarea":
					$input = $("<textarea/>");
					$input.attr({
						name: key,
						id: getId("input", key)
					})
					setAttrs($input, values.attrs);
					break;
				case "group":
					var $group = $("<li><label class='formbuilder-label-group'></label></li>");
					$group.find("label").html(values.label);
					$ul.append($group);
					break;
				default:
					error("unknown type: " + key + ", " + type);
					break;
			}
			if ($input) {
				$input.addClass("formbuilder-input");
				var $li = null,
					$label = $("<label/>");
				if (values.follow) {
					$li = $form.find("li:last");
					$label.addClass("formbuilder-label-follow");
				} else {
					$li = $("<li/>");
					$ul.append($li);
					if (options.labelBreak) {
						$label.addClass("formbuilder-label-break");
					} else {
						$label.addClass("formbuilder-label");
					}
				}
				if (options.labelWidth) {
					$label.css("width", options.labelWidth);
				}
				if (resources && resources[values.label]) {
					$label.html(resources[values.label]);
				} else {
					$label.html(values.label);
				}
				if ($input.length == 1) {
					$label.attr("for", $input.attr("id"));
				}
				if (type != "hidden") {
					$li.append($label);
				}
				$li.append($target ? $target : $input);
				if (values.rules && !$.isEmptyObject(values.rules)) {
					rules[key] = values.rules;
				}
				if (options.requiredAppendix && values.rules && values.rules.required && typeof(values.rules.required) == "boolean") {
					$label.append(options.requiredAppendix);
				}
				if (options.helpImage && values.helpText) {
					var $helpImage = $("<img class='form-help-img'/>");
					$helpImage.attr({
						"src" : options.helpImage,
						"title" : values.helpText
					});
					$label.append($helpImage);
					$helpImage.tooltip();
				}
				if (values.follow) {
					var group = getValidateOptionsHolder("groups"),
						gname = "",
						gvalue = "";
					$li.find(":input").each(function() {
						if (gname.length > 0) {
							gname += "_";
							gvalue += " ";
						}
						var name = $(this).attr("name");
						gname += name;
						gvalue += name;
					});
					group[gname] = gvalue;
				}
			}
		}
		function requiredOne(names) {
			var group = getValidateOptionsHolder("groups"),
				gname = "",
				gvalue = "",
				labels = "",
				msg = null;
			if (typeof(names) === "object") {
				if (names.message) {
					msg = names.message;
				}
				names = names.value;
			}
			if (typeof(names) === "string") {
				names = names.split(",");
			}
			$.each(names, function(index, key) {
				if (labels.length > 0) {
					labels += ", ";
					gname += "_";
					gvalue += " ";
				}
				labels += context.getLabel(key);
				gname += key;
				gvalue += key;
				
				if (!rules[key]) {
					rules[key] = {};
				}
				rules[key].required = function() {
					for (var i=0; i<names.length; i++) {
						if (names[i] == key) {
							continue;
						}
						if (!context.isEmpty(names[i])) {
							return false;
						}
					}
					return true;
				}
			});
			if (msg == null) {
				msg = $.validator.format($.validator.messages.requiredOne, labels);
			}
			$.each(names, function(index, name) {
				var messages = getValidateOptionsHolder("messages");
				if (!messages[name]) {
					messages[name] = {};
				}
				messages[name]["required"] = msg;
			});
			group[gname] = gvalue;
		}
		function buildRelationalRules(key, values) {
			switch (key) {
				case "requiredOne":
					requiredOne(values);
					break;
				default:
					if ($.isFunction(values)) {
						//ToDo
					} else if (typeof(values) == "object") {
						$.each(values, buildRelationalRules);
					}
			}
		}
		if (options.items) {
			$.each(options.items, buildForm);
		}
		if (options.rules) {
			$.each(options.rules, buildRelationalRules);
		}
		if ($.fn.validate && rules) {
			if (options.disableImmediateCheck) {
				validateOptions.onfocusout = false;
				validateOptions.onkeyup = false;
				validateOptions.onclick = false;
			}
			validateOptions.rules = rules;
			debug("validateOptions: ", validateOptions);
			validator = $form.validate(validateOptions);
		}
		return new FormBuilder($form);
	}
	function FormBuilder($form) {
		$.extend(this, {
			"validate" : function() {
				return $form.validate().form();
			},
			"getJson" : function() {
				var ret = {};
				$form.find(":input").each(function() {
					var $el = $(this),
						name = $el.attr("name"),
						value = $el.val(),
						type = $el.attr("type");
					if (type == "checkbox" || type == "radio") {
						if (!$el.is(":checked")) {
							return;
						}
					}
					if (ret[name]) {
						var old = ret[name];
						if ($.isArray(old)) {
							old.push(value);
						} else {
							var array = [];
							array.push(old);
							array.push(value);
							ret[name] = array;
						}
					} else {
						ret[name] = value;
					}
				});
				return ret;
			}
		});
	}
})(jQuery);
