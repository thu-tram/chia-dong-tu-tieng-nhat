// drill.js

import rules from './rules.js';

const qs = (sel, ctx) => (ctx || document).querySelector(sel);
const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
const elById = (id) => document.getElementById(id);

function setHtml(el, html) {
  if (el) el.innerHTML = html;
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function show(el) {
  if (el) el.style.display = 'block';
}

function hide(el) {
  if (el) el.style.display = 'none';
}

const tagTranslations = {
  "plain": "thường",
  "polite": "lịch sự",
  "negative": "phủ định",
  "past": "quá khứ",
  "te-form": "thể て",
  "progressive": "tiếp diễn",
  "desire": "mong muốn",
  "volitional": "ý chí / ý định",
  "potential": "khả năng",
  "conditional": "điều kiện (たら)",
  "provisional": "giả định (ば)",
  "imperative": "mệnh lệnh",
  "passive": "bị động",
  "causative": "sai khiến",
  "dictionary": "từ điển",
  "affirmative": "khẳng định",
  "present": "hiện tại",
  "active": "chủ động"
};

const phraseTranslations = {
  "affirmative": "khẳng định",
  "negative": "phủ định",
  "present": "hiện tại",
  "past": "quá khứ",
  "plain": "thông thường (thể ngắn)",
  "polite": "lịch sự (thể ます)",
  "て": "thể て",
  "non-て": "không phải thể て",
  "potential": "khả năng",
  "non-potential": "không khả năng",
  "conditional": "điều kiện (たら)",
  "non-conditional": "không điều kiện",
  "provisional": "giả định (ば)",
  "non-provisional": "không giả định",
  "imperative": "mệnh lệnh",
  "non-imperative": "không mệnh lệnh",
  "causative": "sai khiến",
  "non-causative": "không sai khiến",
  "passive": "bị động",
  "active": "chủ động",
  "progressive": "tiếp diễn (ている)",
  "non-progressive": "không tiếp diễn",
  "&apos;desire&apos;": "mong muốn (たい)",
  "'desire'": "mong muốn (たい)",
  "&apos;non-desire&apos;": "không mong muốn",
  "'non-desire'": "không mong muốn",
  "volitional": "ý định / ý chí",
  "non-volitional": "không ý định"
};

function translateTag(tag) {
  return tagTranslations[tag] || tag;
}

function translateTags(tags) {
  return tags.filter(function (t) { return t !== ""; }).map(translateTag);
}

function tagSpans(tags) {
  return tags.filter(function (t) { return t !== ""; }).map(function (tag) {
    return "<span class='tag' data-tag='" + tag + "'>" + translateTag(tag) + "</span>";
  }).join(" ");
}

function confirmAndStopQuiz() {
  if (confirm("Bạn có chắc chắn muốn dừng làm bài và quay lại trang chủ không?")) {
    showSplash();
  }
}

function getGroupCheckboxes(group) {
  var ids = [];
  switch (group) {
    case 'conjugations':
      ids = ['plain', 'polite', 'negative', 'past', 'te-form', 'progressive', 'desire', 'volitional', 'potential', 'conditional', 'provisional', 'imperative', 'passive', 'causative'];
      break;
    case 'verbs':
      ids = ['godan', 'ichidan', 'suru', 'kuru', 'iku', 'aru', 'iru'];
      break;
    case 'adjectives':
      ids = ['i-adjective', 'na-adjective', 'ii'];
      break;
    case 'filters':
      ids = ['common', 'n5', 'n4', 'n3', 'n2', 'n1'];
      break;
  }
  return ids.map(elById).filter(Boolean);
}

var words;
var count_dict;
var grp_sample;
var transformations = [];
var question_pool = [];
var log;

const configOptions = {

  options: ["plain", "polite", "negative", "past", "te-form", "progressive",
    "potential", "conditional", "provisional", "imperative", "passive", "causative", "godan", "ichidan",
    "iku", "kuru", "suru", "aru", "iru", "i-adjective", "na-adjective", "ii", "desire",
    "volitional", "trick", "kana", "furigana_always", "go_to_next_question",
    "auto_show_explanation", "use_voice", "common", "n5", "n4", "n3", "n2", "n1"],

  selects: ["questionFocus"],

  inputs: ["numQuestions"]
}

const defaultConfig = {
  "plain": true,
  "polite": false,
  "negative": true,
  "past": true,
  "te-form": false,
  "progressive": false,
  "potential": false,
  "conditional": false,
  "provisional": false,
  "imperative": false,
  "passive": false,
  "causative": false,
  "godan": true,
  "ichidan": true,
  "iku": true,
  "kuru": true,
  "suru": true,
  "iru": true,
  "aru": true,
  "i-adjective": false,
  "na-adjective": false,
  "ii": false,
  "desire": false,
  "volitional": false,
  "trick": true,
  "kana": false,
  "furigana_always": true,
  "go_to_next_question": false,
  "auto_show_explanation": false,
  "use_voice": false,
  "common": true,
  "n5": true,
  "n4": false,
  "n3": false,
  "n2": false,
  "n1": false,
  "questionFocus": "none",
  "numQuestions": "10"
}

const localStorageOptionsKey = "conjugationDrillOptions";

Array.prototype.randomElement = function () {
  return this[Math.floor(Math.random() * this.length)]
}

function getCursorPosition(input) {
  if (!input) return 0;
  if ('selectionStart' in input) {
    return input.selectionStart;
  }
  return input.value ? input.value.length : 0;
}

function setCursorPosition(input, pos) {
  if (!input) return;
  if (input.setSelectionRange) {
    input.focus();
    input.setSelectionRange(pos, pos);
  }
}

// Ranges taken from http://www.unicode.org/charts/

var japaneseTextPattern = /^[\u{3040}-\u{309f}\u{30a0}-\u{30ff}\u{3190}-\u{319f}\u{31f0}-\u{31ff}\u{3400}-\u{4dbf}\u{4e00}-\u{9ffc}\u{f900}-\u{faff}\u{ff00}-\u{ffef}\u{1b000}-\u{1b0ff}\u{1b100}-\u{1b12f}\u{1b130}-\u{1b16f}\u{20000}-\u{2a6dd}\u{2a700}-\u{2b734}\u{2b740}-\u{2b81d}\u{2b820}-\u{2cea1}\u{2ceb0}-\u{2ebe0}\u{2f800}-\u{2fa1f}\u{30000}-\u{3134a}]*$/u;

function commaList(items, conjunction) {

  if (conjunction == undefined || conjunction === "or") {
    conjunction = "hoặc";
  } else if (conjunction === "and") {
    conjunction = "và";
  }

  var result = "";

  for (var i = 0; i < items.length; i++) {
    result = result + items[i];

    if (i < (items.length - 2)) {
      result += ", ";
    }

    if (i == (items.length - 2)) {
      result += " " + conjunction + " ";
    }
  }

  return result;
}

function resetLog() {
  log = { "history": [] };
}

function kanaForm(words) {

  if (words.constructor !== Array) {
    words = [words];
  }

  return words.map(function (word) { return word.split(/.\[([^\]]*)\]/).join(""); });
}

function kanjiForm(words) {

  if (words.constructor !== Array) {
    words = [words];
  }

  return words.map(function (word) { return word.split(/(.+)\[[^\]]*\]/).join(""); });
}

function getVerbForms(entry) {

  var result = {
    "kanji": {},
    "hiragana": {},
    "furigana": {}
  };
  Object.keys(words[entry].conjugations).forEach(function (key) {
    result["kanji"][key] = kanjiForm(words[entry].conjugations[key].forms);
    result["hiragana"][key] = kanaForm(words[entry].conjugations[key].forms);
    result["furigana"][key] = words[entry].conjugations[key].forms;
  });

  return result;
}

function wordWithFurigana(words) {

  var options = getOptions();

  if (words.constructor !== Array) {
    words = [words];
  }

  return words.map(function (word) {

    var bits = word.split(/(.)\[([^\]]*)\]/);

    while (bits.length > 1) {
      if (options["kana"]) {
        bits[0] = bits[0] + bits[2] + bits[3];
      } else if (options["furigana_always"]) {
        bits[0] = bits[0] + "<ruby>" + bits[1] + "<rp>(</rp><rt>" + bits[2] + "</rt><rp>)</rp></ruby>" + bits[3];
      } else {
        bits[0] = bits[0] + "<ruby class='furiganaHover'>" + bits[1] + "<rp>(</rp><rt>" + bits[2] + "</rt><rp>)</rp></ruby>" + bits[3];
      }
      bits.splice(1, 3);
    }

    return bits[0];
  });
}

function processAnswerKey() {

  var el = elById('answer');

  var pos = getCursorPosition(el);
  var val = el.value;

  var last1 = val.slice(pos - 1, pos);
  var last2 = val.slice(pos - 2, pos);
  var last3 = val.slice(pos - 3, pos);

  var replace1 = {
    "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お"
  };

  var replace2 = {

    "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
    "sa": "さ", "si": "し", "su": "す", "se": "せ", "so": "そ",
    "ta": "た", "ti": "ち", "tu": "つ", "te": "て", "to": "と",
    "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の",
    "ha": "は", "hi": "ひ", "hu": "ふ", "he": "へ", "ho": "ほ",
    "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も",
    "ra": "ら", "ri": "り", "ru": "る", "re": "れ", "ro": "ろ",
    "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ", "go": "ご",
    "za": "ざ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
    "da": "だ", "di": "ぢ", "du": "づ", "de": "で", "do": "ど",
    "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ",
    "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ",

    "qa": "くぁ", "qi": "くぃ", "qu": "く", "qe": "くぇ", "qo": "くぉ",
    "wa": "わ", "wi": "うぃ", "wu": "う", "we": "うぇ", "wo": "を",
    "ya": "や", "yi": "い", "yu": "ゆ", "ye": "いぇ", "yo": "よ",
    "fa": "ふぁ", "fi": "ふぃ", "fu": "ふ", "fe": "ふぇ", "fo": "ふぉ",
    "ja": "じゃ", "ji": "じ", "ju": "じゅ", "je": "じぇ", "jo": "じょ",
    "la": "ぁ", "li": "ぃ", "lu": "ぅ", "le": "ぇ", "lo": "ぉ",
    "za": "ざ", "zi": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ",
    "xa": "ぁ", "xi": "ぃ", "xu": "ぅ", "xe": "ぇ", "xo": "ぉ",
    "ca": "か", "ci": "し", "cu": "く", "ce": "せ", "co": "こ",
    "va": "ヴぁ", "vi": "ヴぃ", "vu": "ヴ", "ve": "ヴぇ", "vo": "ヴぉ",

    "lu": "っ",

    "nn": "ん", "n'": "ん",

    "nb": "んb", "nc": "んc", "nd": "んd", "nf": "んf", "ng": "んg",
    "nh": "んh", "nj": "んj", "nk": "んk", "nl": "んl", "nm": "んm",
    "np": "んp", "nq": "んq", "nr": "んr", "ns": "んs", "nt": "んt",
    "nv": "んv", "nw": "んw", "nx": "んx", "nz": "んz",

    "aa": "っa", "bb": "っb", "cc": "っc", "dd": "っd", "ee": "っe",
    "ff": "っf", "gg": "っg", "hh": "っh", "ii": "っi", "jj": "っj",
    "kk": "っk", "ll": "っl", "mm": "っm", "oo": "っo", "pp": "っp",
    "qq": "っq", "rr": "っr", "ss": "っs", "tt": "っt", "uu": "っu",
    "vv": "っv", "ww": "っw", "xx": "っx", "yy": "っy", "zz": "っz",
  };

  var replace3 = {

    "kya": "きゃ", "kyi": "きぃ", "kyu": "きゅ", "kye": "きぇ", "kyo": "きょ",
    "sha": "しゃ", "shi": "し", "shu": "しゅ", "she": "しぇ", "sho": "しょ",
    "cha": "ちゃ", "chi": "ち", "chu": "ちゅ", "che": "ちぇ", "cho": "ちょ",
    "nya": "にゃ", "nyi": "にぃ", "nyu": "にゅ", "nye": "にぇ", "nyo": "にょ",
    "hya": "ひゃ", "hyi": "ひぃ", "hyu": "ひゅ", "hye": "ひぇ", "hyo": "ひょ",
    "mya": "みゃ", "myi": "みぃ", "myu": "みゅ", "mye": "みぇ", "myo": "みょ",
    "rya": "りゃ", "ryi": "りぃ", "ryu": "りゅ", "rye": "りぇ", "ryo": "りょ",
    "gya": "ぎゃ", "gyi": "ぎぃ", "gyu": "ぎゅ", "gye": "ぎぇ", "gyo": "ぎょ",
    "zya": "じゃ", "zyi": "じぃ", "zyu": "じゅ", "zye": "じぇ", "zyo": "じょ",
    "dya": "ぢゃ", "dyi": "ぢぃ", "dyu": "ぢゅ", "dye": "ぢぇ", "dyo": "ぢょ",
    "bya": "びゃ", "byi": "びぃ", "byu": "びゅ", "bye": "びぇ", "byo": "びょ",
    "pya": "ぴゃ", "pyi": "ぴぃ", "pyu": "ぴゅ", "pye": "ぴぇ", "pyo": "ぴょ",
    "jiu": "じゅう", "jyu": "じゅ", "jyo": "じょ",

    "shi": "し",
    "tsu": "つ",
  };

  if (replace3[last3]) {
    val = val.slice(0, pos - 3) + replace3[last3] + val.slice(pos, -1);
    el.value = val;
    setCursorPosition(el, pos - 3 + replace3[last3].length);
  } else if (replace2[last2]) {
    val = val.slice(0, pos - 2) + replace2[last2] + val.slice(pos, -1);
    el.value = val;
    setCursorPosition(el, pos - 2 + replace2[last2].length);
  } else if (replace1[last1]) {
    val = val.slice(0, pos - 1) + replace1[last1] + val.slice(pos, -1);
    el.value = val;
    setCursorPosition(el, pos - 1 + replace1[last1].length);
  }
}

function processAnswerKeyDown(evt) {

  if (evt.keyCode == 32) {

    var options = getOptions();

    if (options.use_voice) {

      window.speechSynthesis.cancel();

      textToSpeech(window.questionData.givenWordAsKanji, evt.shiftKey);
      evt.preventDefault();
    }
  }
}

function validQuestion(entry, forms, transformation, options) {

  var valid = true;

  transformation.tags.forEach(function (type) {
    if (options[type] == false) {
      valid = false;
    }
  });

  if (options[words[entry].group] == false) {
    valid = false;
  }

  var pass = true;
  if (!options.n5 && !options.n4 && !options.n3 && !options.n2 && !options.n1 && !options.common) {
    // noOp
  } else {
    pass = false;
    for (const [key, value] of Object.entries(options)) {
      if (value == true && words[entry].tags.includes(key)) {
        pass = true;
      }
    }
  }

  if (!pass) {
    valid = false;
  }

  if (!forms["furigana"][transformation.from])
    valid = false;

  if (!forms["furigana"][transformation.to])
    valid = false;

  if (valid) {

    if (options.questionFocus != "none") {

      if (options.questionFocus == 'tetakei') {
        if (words[entry].conjugations[transformation.from].tetakei == words[entry].conjugations[transformation.to].tetakei) {
          valid = false;
        }
      } else if (transformation.type != options.questionFocus) {
        valid = false;
      }
    }
  }

  return valid;
}

function generateQuestion() {

  var questionText = {
    "affirmative": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể khẳng định</span>",
    "negative": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể phủ định</span>",
    "present": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thì hiện tại</span>",
    "past": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thì quá khứ</span>",
    "plain": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể thường (thể ngắn)</span>",
    "polite": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể lịch sự (thể ます)</span>",
    "て": "<span class='emphasis first'>chuyển</span> từ sau sang <span class='emphasis'>thể て</span>",
    "non-て": "<span class='emphasis first'>bỏ</span> <span class='emphasis'>thể て</span> ở từ sau",
    "potential": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể khả năng</span>",
    "non-potential": "<span class='first'>bỏ</span> <span class='emphasis'>thể khả năng</span> ở từ sau (đưa về thể thường)",
    "conditional": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể điều kiện (たら)</span>",
    "non-conditional": "<span class='first'>bỏ</span> <span class='emphasis'>thể điều kiện (たら)</span> ở từ sau",
    "provisional": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể giả định (ば)</span>",
    "non-provisional": "<span class='first'>bỏ</span> <span class='emphasis'>thể giả định (ば)</span> ở từ sau",
    "imperative": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể mệnh lệnh</span>",
    "non-imperative": "<span class='first'>bỏ</span> <span class='emphasis'>thể mệnh lệnh</span> ở từ sau",
    "causative": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể sai khiến</span>",
    "non-causative": "<span class='first'>bỏ</span> <span class='emphasis'>thể sai khiến</span> ở từ sau",
    "passive": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể bị động</span>",
    "active": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể chủ động</span>",
    "progressive": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể tiếp diễn (ている)</span>",
    "non-progressive": "<span class='first'>bỏ</span> <span class='emphasis'>thể tiếp diễn (ている)</span> ở từ sau",
    "&apos;desire&apos;": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể mong muốn (たい)</span>",
    "&apos;non-desire&apos;": "<span class='first'>bỏ</span> <span class='emphasis'>thể mong muốn (たい)</span> ở từ sau",
    "volitional": "<span class='first'>chuyển</span> từ sau sang <span class='emphasis'>thể ý định / ý chí</span>",
    "non-volitional": "<span class='first'>bỏ</span> <span class='emphasis'>thể ý định / ý chí</span> ở từ sau"
  };

  var entry;
  var to_form;
  var from_form;
  var forms;
  var options = getOptions();
  var word_selection = question_pool.slice();
  var count = 0;

  while (true) {

    if (count++ == 800) {
      showSplash();
      return;
    }

    entry = word_selection.randomElement();
    if (entry === undefined) {
      word_selection = question_pool.slice();
      entry = word_selection.randomElement();
    }

    var transformation = transformations.randomElement();

    from_form = transformation.from;
    to_form = transformation.to;

    forms = getVerbForms(entry);

    var valid = validQuestion(entry, forms, transformation, getOptions());

    if (!valid) {
      var index = word_selection.indexOf(entry);
      word_selection.splice(index, 1);
    }

    if (transformation.tags.indexOf('trick') != -1) {
      if (Math.random() > 0.033) {
        valid = false;
      }
    }

    if (valid) {
      break;
    }
  }

  var kanjiForms = forms["kanji"];
  var kanaForms = forms["hiragana"];
  var furiganaForms = forms["furigana"];

  var candidates;

  if (options["kana"]) {
    candidates = kanaForms[from_form];
  } else {
    candidates = wordWithFurigana(furiganaForms[from_form]);
  }

  var candidateIndex = Math.floor(Math.random() * candidates.length);

  var givenWord = candidates[candidateIndex];
  var givenWordAsKanji = kanjiForms[from_form][candidateIndex];

  var thisQuestionText = questionText[transformation.phrase];

  var questionFirstHalf = thisQuestionText;
  var questionSecondHalf = givenWord;
  var question = questionFirstHalf.replace("từ sau", "từ " + questionSecondHalf).replace("từ sau", "từ " + questionSecondHalf);

  var answer = kanjiForms[to_form];
  var answer2 = kanaForms[to_form];
  var answerWithFurigana = wordWithFurigana(furiganaForms[to_form]);

  if (options["kana"]) {
    answer = answer2;
    answerWithFurigana = kanaForms[to_form];
  }

  setHtml(elById('questionFirstHalf'), questionFirstHalf);

  if (options.use_voice) {
    setHtml(elById('questionSecondHalf'), "<div id='speechSpace'><i>Nhấn phím Space để nghe từ</i><br><div class='halfSpeed'>Nhấn giữ Shift để nghe với tốc độ chậm hơn</div></div>");
  } else {
    setHtml(elById('questionSecondHalf'), questionSecondHalf);
  }

  window.questionData = {
    entry: entry,
    transformation: transformation,
    question: question,
    answer: answer,
    answer2: answer2,
    answerWithFurigana: answerWithFurigana,
    givenWord: givenWord,
    givenWordAsKanji: givenWordAsKanji,
  };

  var data = window.questionData;

  var groupLabels = {
    "godan": "động từ Godan",
    "ichidan": "động từ Ichidan",
    "iku": "động từ Godan đặc biệt (行く)",
    "suru": "động từ Suru",
    "kuru": "động từ Kuru",
    "aru": "động từ đặc biệt ある",
    "iru": "động từ đặc biệt いる",
    "i-adjective": "tính từ đuôi い",
    "ii": "tính từ đặc biệt いい",
    "na-adjective": "tính từ đuôi な",
  };

  var dictionary = words[data.entry].conjugations["dictionary"].forms;
  var meaning = words[data.entry].meaning;
  var sentenceJP = words[data.entry].sentences[0];
  var sentenceEN = words[data.entry].sentences[1];
  var notes = words[data.entry].notes[0];
  var audio = words[data.entry].audio;

  var anchor = elById('jisho-link');
  anchor.setAttribute('href', 'https://mazii.net/vi-VN/search/word/javi/' + sentenceJP);

  if (words[data.entry].group == "na-adjective") {
    for (var i = 0; i < dictionary.length; i++) {
      dictionary[i] = dictionary[i].replace(/だ$/, '')
    }
  }

  if (!options["kana"]) {
    dictionary = wordWithFurigana(dictionary);
  } else {
    dictionary = kanaForm(dictionary);
  }

  setHtml(elById('explain-audio'), audio);
  setHtml(elById('explain-given-base'), dictionary);
  setHtml(elById('explain-notes'), notes);
  setHtml(elById('explain-meaning'), meaning);
  setHtml(elById('explain-sentence-jp'), sentenceJP);
  setHtml(elById('explain-sentence-en'), sentenceEN);
  setHtml(elById('explain-given'), givenWord);
  setHtml(elById('explain-given-tags'), tagSpans(data.transformation.from_tags));
  qsa('.explain-given-dictionary').forEach(function (el) { el.innerHTML = dictionary; });
  setText(elById('explain-group'), groupLabels[words[data.entry].group]);
  qsa('.explain-transform').forEach(function (el) { el.innerHTML = phraseTranslations[data.transformation.phrase] || data.transformation.phrase; });
  qsa('.explain-answer-tags').forEach(function (el) { el.innerHTML = tagSpans(data.transformation.to_tags); });
  qsa('.explain-answer-tags2').forEach(function (el) { el.innerHTML = tagSpans(data.transformation.to_tags); });
  qsa('.explain-answer').forEach(function (el) { el.innerHTML = commaList(data.answerWithFurigana, "hoặc"); });

  qsa('.explain-answer-as-list').forEach(function (el) {
    el.innerHTML = data.answerWithFurigana.map(function (answer) {
      return "<li>" + answer + "</li>";
    }).join("");
  });

  var isTrick = window.questionData.transformation.tags.indexOf("trick") != -1;

  qsa('.explain-trick').forEach(function (el) { el.style.display = isTrick ? 'block' : 'none'; });
  qsa('.explain-no-trick').forEach(function (el) { el.style.display = isTrick ? 'none' : 'block'; });

  if (data.transformation.to == "dictionary") {
    qsa('.explain-hide-end').forEach(hide);
  } else {
    qsa('.explain-hide-end').forEach(show);
  }

  if (data.answer.length == 1) {
    qsa('.explain-answer-single').forEach(show);
    qsa('.explain-answer-multiple').forEach(hide);
  } else {
    qsa('.explain-answer-single').forEach(hide);
    qsa('.explain-answer-multiple').forEach(show);
  }

  setHtml(elById('response'), "");
  hide(elById('message'));

  hide(elById('proceed'));
  hide(elById('explanation'));
  show(elById('inputArea'));

  var answerEl = elById('answer');
  if (answerEl) answerEl.focus();
}

function processAnswer() {

  var options = getOptions();
  var questionData = window.questionData;
  var answerEl = elById('answer');
  var response = answerEl.value.trim();

  var shake = false;

  if (response == "")
    shake = true;

  if (!response.match(japaneseTextPattern))
    shake = true;

  if (shake) {
    shakeInputArea();
    return;
  }

  var correct = ((questionData.answer.indexOf(response) != -1) || (questionData.answer2.indexOf(response) != -1));

  var klass = correct ? "correct" : "incorrect";

  log.history.push({
    "question": questionData.question,
    "response": response,
    "answer": questionData.answerWithFurigana,
    "kana": questionData.answer2,
    "correct": correct
  });

  var totalQuestions = Number(elById('numQuestions').value);
  var answeredQuestions = log.history.length;

  updateProgressBar(answeredQuestions / totalQuestions * 100);

  answerEl.value = "";

  var responseButton = elById('responseButton');
  responseButton.className = klass;
  responseButton.textContent = response;

  if (correct) {
    hide(elById('message'));
  } else {
    show(elById('message'));
    setHtml(elById('correction'), "Đáp án đúng là " + commaList(questionData.answerWithFurigana, "hoặc"));
  }

  hide(elById('inputArea'));
  show(elById('proceed'));
  hide(elById('explanation'));

  var proceedButton = qs('#proceed button');
  if (proceedButton) proceedButton.focus();

  updateHistoryView(log);

  if (correct) {
    if (options.go_to_next_question) {
      proceed();
    }
  } else {
    if (options.auto_show_explanation) {
      explain();
    }
  }
  window.scrollTo(0, 0);
}

function shakeInputArea() {
  var inputArea = elById('inputArea');
  if (!inputArea) return;

  inputArea.classList.remove('shake');
  inputArea.classList.add('shake');
}

function createMark(text, className) {
  var span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function updateHistoryView(log) {

  var historyEl = elById('history');
  if (!historyEl) return;

  var review = document.createElement('div');

  var total = 0;
  var correct = 0;

  log.history.forEach(function (entry, index) {

    total++;

    if (entry.correct) {
      correct++;
    }

    var tr = document.createElement('div');
    tr.className = 'history-row';

    var td1 = document.createElement('div');
    td1.className = 'history-question';
    var td2 = document.createElement('div');
    td2.className = 'history-answer';

    td1.innerHTML = (index + 1) + ". " + entry.question + ".";

    var responseDiv = document.createElement('div');
    responseDiv.textContent = entry.response;

    if (entry.correct) {
      responseDiv.appendChild(createMark(' 〇', 'answer-correct'));
    } else {
      responseDiv.appendChild(createMark(' ×', 'answer-wrong'));
    }

    td2.appendChild(responseDiv);

    if (!entry.correct) {

      var correctDiv = document.createElement('div');

      correctDiv.innerHTML = commaList(entry.answer, "hoặc");
      correctDiv.appendChild(createMark(' 〇', 'answer-correct'));

      td2.appendChild(correctDiv);
    }

    tr.appendChild(td1);
    tr.appendChild(td2);

    review.appendChild(tr);
  });

  historyEl.innerHTML = "";
  historyEl.appendChild(review);

  var resultString;

  if (correct == total) {
    resultString = "Đúng tất cả!";
  } else if (correct == 0) {
    resultString = "Sai tất cả!";
  } else {
    resultString = "Đúng " + correct + " trên tổng số " + total + " câu";
  }

  setText(elById('scoreSectionTitleNarrow'), resultString);
  setText(elById('scoreSectionTitleWide'), resultString);
}

function updateProgressBar(progress) {
  var bar = qs('.progressBar');
  if (bar) bar.style.width = progress + '%';
}

function proceed() {
  if (log.history.length == Number(elById('numQuestions').value)) {
    endQuiz();
  } else {
    generateQuestion();
  }
}

function showSplash() {
  show(elById('splash'));
  hide(elById('quizSection'));
  hide(elById('scoreSection'));

  var go = elById('go');
  if (go) go.focus();
}

export default function checkAnswer() {
  processAnswer();
}

function startQuiz(event) {
  event.preventDefault();

  var options = getOptions();

  const voiceSelectError = elById('voiceSelectError');

  if (options.use_voice && !getVoiceConfig()) {
    voiceSelectError.style.display = "block";
    return;
  } else {
    voiceSelectError.style.display = "none";
  }

  updateProgressBar(0);

  hide(elById('splash'));
  show(elById('quizSection'));
  hide(elById('scoreSection'));

  if (options.furigana_always) {
    document.body.classList.add("furiganaAlways");
  } else {
    document.body.classList.remove("furiganaAlways");
  }

  resetLog();
  generateQuestion();
}

function endQuiz() {
  hide(elById('splash'));
  hide(elById('quizSection'));
  show(elById('scoreSection'));

  var backToStart = elById('backToStart');
  if (backToStart) backToStart.focus();
}

// Text to Speech

function loadVoiceList(callback) {
  if (window.speechSynthesis.getVoices().length == 0) {
    window.speechSynthesis.addEventListener('voiceschanged', function () {
      if (callback) {
        callback();
      }
    });
  } else {
    if (callback) {
      callback();
    }
  }
}

function populateVoiceList() {

  loadVoiceList(function () {

    var voiceSelect = elById('voice_select');

    voiceSelect.innerHTML = "<option>Chọn giọng đọc...</option>" +
      window.speechSynthesis.getVoices().map(function (voice) { return "<option>" + voice.name + "</option>" }).join("");

    var currentVoice = getCurrentVoice();

    if (currentVoice) {
      voiceSelect.value = currentVoice;
    }
  });
}

function getVoiceConfig() {
  return JSON.parse(localStorage.getItem("voiceConfig"));
}

function setVoiceConfig(config) {
  localStorage.setItem("voiceConfig", JSON.stringify(config));
}

function getCurrentVoice() {
  const voiceConfig = getVoiceConfig();

  if (voiceConfig) {
    return voiceConfig.voice;
  }
}

function textToSpeech(text, slowMode, callback) {

  loadVoiceList(function () {

    const availableVoices = window.speechSynthesis.getVoices();

    const voiceConfig = getVoiceConfig();
    const currentVoice = voiceConfig.voice;

    var voice = '';

    for (var i = 0; i < availableVoices.length; i++) {
      if (availableVoices[i].name == currentVoice) {
        voice = availableVoices[i];
        break;
      }
    }

    if (voice === '') {
      voice = availableVoices[0];
    }

    var utter = new SpeechSynthesisUtterance();
    utter.rate = slowMode ? voiceConfig.rate * 0.5 : voiceConfig.rate;
    utter.pitch = voiceConfig.pitch;
    utter.text = text;
    utter.voice = voice;

    utter.onend = function () {
      if (callback) {
        callback(undefined);
      }
    }

    window.speechSynthesis.speak(utter);
  });
}

function arrayDifference(a, b) {
  return a.filter(function (x) { return b.indexOf(x) < 0 });
}

function arrayUnique(arr) {
  return arr.filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });
}

function calculateTransitions() {

  function getTags(str) {

    var tags = str.split(" ");

    if ((tags.length == 1) && (tags[0] == "plain")) {
      tags = [];
    }

    return tags;
  }

  function calculateTags(tags) {

    tags = tags.split(" ");

    if (tags.indexOf("polite") == -1) {
      tags.splice(0, 0, "plain");
    }

    if (tags.indexOf("dictionary") != -1) {
      tags.splice(tags.indexOf("dictionary"), 1);
    }

    return tags;
  }

  var allTags = {};

  Object.keys(words).forEach(function (word) {
    Object.keys(words[word].conjugations).forEach(function (conjugation) {

      if (conjugation == "dictionary") {
        conjugation = "";
      }

      allTags[conjugation] = conjugation.split(" ");
    });
  });

  Object.keys(allTags).forEach(function (srcTag) {

    if (srcTag != "") {

      for (var i = 0; i < allTags[srcTag].length; i++) {

        var tagWithDrop = allTags[srcTag].slice();

        tagWithDrop.splice(i, 1);

        var dstTag = tagWithDrop.join(" ");

        if (allTags[dstTag]) {

          if (srcTag == "") {
            srcTag = "dictionary";
          }

          if (dstTag == "") {
            dstTag = "dictionary";
          }

          transformations.push({ from: srcTag, to: dstTag });
          transformations.push({ from: dstTag, to: srcTag });
        }
      }
    }
  });

  transformations.forEach(function (transformation) {

    var from = getTags(transformation.from);
    var to = getTags(transformation.to);

    var from_extra = {
      "negative": "affirmative",
      "past": "present",
      "polite": "plain",
      "te-form": "non-て",
      "potential": "non-potential",
      "conditional": "non-conditional",
      "provisional": "non-provisional",
      "imperative": "non-imperative",
      "causative": "non-causative",
      "passive": "active",
      "progressive": "non-progressive",
      "desire": "&apos;non-desire&apos;",
      "volitional": "non-volitional",
    };

    var to_extra = {
      "negative": "negative",
      "past": "past",
      "polite": "polite",
      "te-form": "て",
      "potential": "potential",
      "conditional": "conditional",
      "provisional": "provisional",
      "imperative": "imperative",
      "causative": "causative",
      "passive": "passive",
      "progressive": "progressive",
      "desire": "&apos;desire&apos;",
      "volitional": "volitional",
    };

    var phrase;
    var type;

    phrase = phrase || from_extra[arrayDifference(from, to)[0]];
    phrase = phrase || to_extra[arrayDifference(to, from)[0]];

    transformation.phrase = phrase;

    transformation.from_tags = calculateTags(transformation.from);
    transformation.to_tags = calculateTags(transformation.to);
    transformation.tags = arrayUnique(calculateTags(transformation.from).concat(calculateTags(transformation.to)));

    var diffFromTo = arrayDifference(transformation.from_tags, transformation.to_tags);

    if (diffFromTo.length > 0) {
      type = diffFromTo[0];
    } else {
      type = arrayDifference(transformation.to_tags, transformation.from_tags)[0];
    }

    if ((type == "plain") || (type == "polite")) {
      type = "politeness";
    }

    transformation.type = type;
  });

  // Add trick forms

  var trick_forms = [];

  transformations.forEach(function (transformation) {
    trick_forms.push({
      from: transformation.to,
      to: transformation.to,
      type: transformation.type,
      phrase: transformation.phrase,
      from_tags: transformation.to_tags,
      to_tags: transformation.to_tags,
      tags: transformation.tags.concat(["trick"])
    });
  });

  transformations = transformations.concat(trick_forms);
}

function updateQuestionPool() {
  var options = getOptions();
  var active_options = Object.keys(options).filter(function (key) { return options[key] == true; });
  question_pool = [];

  Object.keys(words).forEach(function (word) {
    if (active_options.includes(words[word].group)) {
      question_pool.push(word);
      return;
    }
  });
}

function updateOptionSummary() {
  updateQuestionPool();
  // Calculate how many questions will apply using the json count_dict
  var applicable = 0;

  var options = getOptions();

  Object.keys(grp_sample).forEach(function (word) {

    var forms = getVerbForms(word);
    let modifier = 0;

    transformations.forEach(function (transformation) {

      if (validQuestion(word, forms, transformation, options)) {
        modifier = count_dict[grp_sample[word].group];
        applicable += modifier;
      }
    });
  });

  setText(elById('questionCount'), applicable);

  var numQuestionsEl = elById('numQuestions');
  if (applicable < numQuestionsEl.value) {
    elById('noQuestionError').style.display = 'block';
  } else {
    elById('noQuestionError').style.display = 'none';
  }

  if (!options.plain && !options.polite) {
    elById('politePlainError').style.display = 'block';
  } else {
    elById('politePlainError').style.display = 'none';
  }
}

function saveOptions() {
  localStorage.setItem(localStorageOptionsKey, JSON.stringify(getOptions()));
}

function restoreDefaults() {
  localStorage.setItem(localStorageOptionsKey, JSON.stringify(defaultConfig));
  loadOptions();
  updateOptionSummary();
}

function updateVoiceSelect() {

  const options = getOptions();
  const voice_select_options = elById('voice_select_options');

  if (options.use_voice) {
    voice_select_options.style.display = "block";
  } else {
    voice_select_options.style.display = "none";
  }
}

function updateVoiceSelection() {

  const newSelection = elById('voice_select').selectedOptions[0].text;

  const voiceConfig = {
    voice: elById('voice_select').selectedOptions[0].text,
    rate: 1,
    pitch: 1
  };

  setVoiceConfig(voiceConfig);
}

function explain() {
  show(elById('explanation'));
  hide(elById('message'));

  var explainProceedButton = elById('explain-proceed-button');
  if (explainProceedButton) explainProceedButton.focus();
}

function getOptions() {

  var result = {};

  configOptions.options.forEach(function (option) {
    var el = elById(option);
    result[option] = el ? el.checked : false;
  });

  configOptions.selects.forEach(function (select) {
    var el = elById(select);
    result[select] = el ? el.value : "";
  });

  configOptions.inputs.forEach(function (input) {
    var el = elById(input);
    result[input] = el ? el.value : "";
  });

  return result;
}

function loadOptions() {

  var storedOptionsText = localStorage.getItem(localStorageOptionsKey);

  if (storedOptionsText) {

    var storedOptions = JSON.parse(storedOptionsText);

    configOptions.options.forEach(function (option) {
      if (storedOptions[option] != undefined) {
        var el = elById(option);
        if (el) el.checked = storedOptions[option];
      }
    });

    configOptions.selects.forEach(function (select) {
      if (storedOptions[select] != undefined) {
        var el = elById(select);
        if (el) el.value = storedOptions[select];
      }
    });

    configOptions.inputs.forEach(function (input) {
      if (storedOptions[input] != undefined) {
        var el = elById(input);
        if (el) el.value = storedOptions[input];
      }
    });
  }
}

function calculateConjugations(word, conjugation) {

  if (words[word] == undefined)
    return undefined;

  var group = words[word].group;
  var dictionary = words[word].dictionary;

  if (conjugation == 'dictionary')
    return dictionary;

  if (rules[group] == undefined)
    return undefined;

  if (rules[group][conjugation] == undefined)
    return undefined;

  var conjugations = rules[group][conjugation].forms;

  var result = {
    forms: []
  };

  if (rules[group][conjugation].tetakei) {
    result.tetakei = true;
  }

  conjugations.forEach(function (rule) {

    if (rule.before && rule.after) {
      if (dictionary.endsWith(rule.before)) {
        result.forms.push(dictionary.substring(0, dictionary.length - rule.before.length) + rule.after);
      }
    }

    if (rule.result) {
      result.forms.push(rule.result);
    }
  });
  return result;
}

function calculateAllConjugations() {

  Object.keys(words).forEach(function (word) {

    words[word].conjugations = {
      "dictionary": { forms: [words[word].dictionary] },
    };

    var group = words[word].group;
    Object.keys(rules[group]).forEach(function (conjugation) {
      words[word].conjugations[conjugation] = calculateConjugations(word, conjugation);
    })
  });
}

function runMain() {
  calculateAllConjugations();
  calculateTransitions();
  loadOptions();
  restoreDefaults();
  updateOptionSummary();
  showSplash();
}

function loadData() {
  return Promise.all([
    fetch('./words.json').then(function (res) { return res.json(); }),
    fetch('./count.json').then(function (res) { return res.json(); }),
    fetch('./grp_sample.json').then(function (res) { return res.json(); })
  ]).then(function (results) {
    words = results[0];
    count_dict = results[1];
    grp_sample = results[2];
    runMain();
  }).catch(function (error) {
    console.error('không load được dữ liệu', error);
  });
}

function init() {

  var answerEl = elById('answer');
  if (answerEl) {
    answerEl.addEventListener('input', processAnswerKey);
    answerEl.addEventListener('keydown', processAnswerKeyDown);
  }

  var quizForm = document.querySelector('form[name="quizForm"]');
  if (quizForm) {
    quizForm.addEventListener('submit', function (event) {
      event.preventDefault();
      processAnswer();
    });
  }

  var go = elById('go');
  if (go) go.addEventListener('click', startQuiz);

  var defaults = elById('defaults');
  if (defaults) {
    defaults.addEventListener('click', function (event) {
      event.preventDefault();
      restoreDefaults();
    });
  }

  var backToStart = elById('backToStart');
  if (backToStart) backToStart.addEventListener('click', showSplash);

  var responseButton = elById('responseButton');
  if (responseButton) responseButton.addEventListener('click', proceed);

  var explainProceedButton = elById('explain-proceed-button');
  if (explainProceedButton) explainProceedButton.addEventListener('click', proceed);

  var stopQuiz = elById('stopQuiz');
  if (stopQuiz) {
    stopQuiz.addEventListener('click', function (event) {
      event.preventDefault();
      confirmAndStopQuiz();
    });
  }

  qsa('.select-all-btn').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      var group = btn.dataset.group;
      getGroupCheckboxes(group).forEach(function (el) { el.checked = true; });
      updateOptionSummary();
      saveOptions();
    });
  });

  qsa('.deselect-all-btn').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      var group = btn.dataset.group;
      getGroupCheckboxes(group).forEach(function (el) { el.checked = false; });
      updateOptionSummary();
      saveOptions();
    });
  });

  qsa('.options input').forEach(function (el) {
    el.addEventListener('click', updateOptionSummary);
  });

  var questionFocus = elById('questionFocus');
  if (questionFocus) questionFocus.addEventListener('change', updateOptionSummary);

  var trick = elById('trick');
  if (trick) trick.addEventListener('click', updateOptionSummary);

  var focusMode = elById('focus_mode');
  if (focusMode) focusMode.addEventListener('click', updateOptionSummary);

  qsa('select').forEach(function (el) {
    el.addEventListener('change', saveOptions);
  });

  qsa('input').forEach(function (el) {
    el.addEventListener('change', saveOptions);
  });

  qsa('#message .btn').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      explain();
    });
  });
}

function boot() {
  init();
  loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.processAnswer = processAnswer;
window.proceed = proceed;
window.explain = explain;