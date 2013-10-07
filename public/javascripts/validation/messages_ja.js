/*
 * Translated default messages for the jQuery validation plugin.
 * Locale: JA (Japanese; 日本語)
 */
(function ($) {
	$.extend($.validator.messages, {
		required: "このフィールドは必須です。",
		remote: "このフィールドを修正してください。",
		email: "有効なEメールアドレスを入力してください。",
		url: "有効なURLを入力してください。",
		date: "有効な日付を入力してください。",
		dateISO: "有効な日付（ISO）を入力してください。",
		number: "有効な数字を入力してください。",
		digits: "数字のみを入力してください。",
		creditcard: "有効なクレジットカード番号を入力してください。",
		equalTo: "同じ値をもう一度入力してください。",
		accept: "有効な拡張子を含む値を入力してください。",
		maxlength: $.format("{0} 文字以内で入力してください。"),
		minlength: $.format("{0} 文字以上で入力してください。"),
		rangelength: $.format("{0} 文字から {1} 文字までの値を入力してください。"),
		range: $.format("{0} から {1} までの値を入力してください。"),
		max: $.format("{0} 以下の値を入力してください。"),
		min: $.format("{0} 以上の値を入力してください。"),
		
		
		hiragana: "全角ひらがなを入力してください",
		katakana: "全角カタカナを入力してください",
		hankana: "半角カタカナを入力してください",
		alpha: "半角英字を入力してください",
		alphanum: "半角英数字を入力してください",
		postcode: "郵便番号を入力してください（例:123-4567）",
		tel: "電話番号を入力してください（例:012-345-6789）",
		regexp: "「{0}」形式で入力してください",
		requiredOne: "{0}のいずれかは必須です"
	});
}(jQuery));