import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineEmotText, isEmoticonOnlyContent } from "../dist/InlineEmotText.js";
import { MedalBadge } from "../dist/MedalBadge.js";
import { DanmakuImage } from "../dist/image.js";
import { formatDateTime, formatTimestamp, parseBubbleColor } from "../dist/display.js";
import {
  DEFAULT_PRICE_COLORS,
  formatMessagePrice,
  normalizePriceColors,
  resolveMessageAccent,
} from "../dist/price-chip.js";

const BASE_MESSAGE = {
  id: "message-1",
  roomId: 7,
  type: "danmaku",
  username: "测试用户",
  content: "测试正文",
  timestamp: 1_723_979_200,
};

test("partial price colors retain the nine defaults and discard legacy keys", () => {
  assert.deepEqual(normalizePriceColors(), DEFAULT_PRICE_COLORS);
  assert.deepEqual(normalizePriceColors({ scTier2: "abc", gift: "legacy" }), {
    ...DEFAULT_PRICE_COLORS,
    scTier2: "abc",
  });
  assert.equal(Object.keys(normalizePriceColors({ gift: "legacy" })).length, 9);
});

test("SC and paid gifts use the same amount tiers with their original units", () => {
  const amounts = [30, 31, 50, 51, 100, 101, 500, 501, 1000, 1001];
  const tiers = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6];
  for (let index = 0; index < amounts.length; index += 1) {
    const amount = amounts[index];
    const expected = DEFAULT_PRICE_COLORS[`scTier${tiers[index]}`];
    assert.equal(resolveMessageAccent({ ...BASE_MESSAGE, type: "superChat", price: amount }), expected);
    assert.equal(
      resolveMessageAccent({ ...BASE_MESSAGE, type: "gift", price: 1000, count: amount }),
      expected,
    );
  }
  assert.equal(resolveMessageAccent({ ...BASE_MESSAGE, type: "gift", price: 0 }), undefined);
  assert.equal(resolveMessageAccent({ ...BASE_MESSAGE, type: "gift" }), undefined);
  assert.equal(
    resolveMessageAccent({ ...BASE_MESSAGE, type: "superChat", price: 31 }, { scTier2: "abc" }),
    "#abc",
  );
  assert.equal(
    resolveMessageAccent({ ...BASE_MESSAGE, type: "superChat", price: 31 }, { scTier2: "invalid" }),
    DEFAULT_PRICE_COLORS.scTier2,
  );
  for (const [guardLevel, color] of [
    [1, DEFAULT_PRICE_COLORS.guardGovernor],
    [2, DEFAULT_PRICE_COLORS.guardAdmiral],
    [3, DEFAULT_PRICE_COLORS.guardCaptain],
  ]) {
    assert.equal(resolveMessageAccent({ ...BASE_MESSAGE, type: "guard", guardLevel }), color);
  }
});

test("price text preserves SC yuan and gift or guard unit-price times count", () => {
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "superChat", price: 30, count: 2 }), "¥30");
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "gift", price: 100, count: 2 }), "¥0.20");
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "gift", price: 1100 }), "¥1.10");
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "gift", price: 100_600 }), "¥101");
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "guard", price: 138_000, count: 2 }), "¥276");
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "gift", price: 0 }), undefined);
  assert.equal(formatMessagePrice({ ...BASE_MESSAGE, type: "gift" }), undefined);
});

test("display helpers retain local time formatting and Android bubble color order", () => {
  const timestamp = new Date(2026, 0, 2, 3, 4, 5).getTime() / 1000;
  assert.equal(formatTimestamp(timestamp), "03:04");
  assert.equal(formatTimestamp(timestamp, true), "03:04:05");
  assert.equal(formatDateTime(timestamp), "2026-01-02 03:04:05");
  assert.equal(formatTimestamp(), "");
  assert.equal(formatTimestamp(0), "");
  assert.equal(formatDateTime(), "");
  assert.deepEqual(parseBubbleColor("#1453BAFF,#3353BAFF,#3353BAFF"), {
    start: "#53baff14",
    end: "#53baff33",
    border: "#53baff33",
  });
  assert.deepEqual(parseBubbleColor(" #ABCDEF "), {
    start: "#abcdef",
    end: "#abcdef",
    border: undefined,
  });
  assert.equal(parseBubbleColor("#1453BAFF,invalid,#3353BAFF"), undefined);
  assert.equal(parseBubbleColor(), undefined);
});

test("inline emoticons match the longest escaped tokens and preserve image adapter inputs", () => {
  const images = [];
  const emots = {
    "[哈]": { url: "single.png" },
    "[哈][哈]": { url: "double.png", emoji: "双笑", descript: "双表情", width: 40, height: 18 },
    "[x]+.": { url: "special.png" },
  };
  function CaptureImage(props) {
    images.push(props);
    return createElement("img", { src: props.src, alt: props.alt });
  }
  const markup = renderToStaticMarkup(createElement(InlineEmotText, {
    content: "前[哈][哈]后[x]+.",
    emots,
    cachedEmotUrls: new Set(["double.png"]),
    imageComponent: CaptureImage,
    resolveImageUrl: (url) => `https://cache.invalid/${url}`,
  }));
  assert.equal(images.length, 2);
  assert.deepEqual(images.map(({ src, persistent, alt, title, style, className }) => ({
    src, persistent, alt, title, style, className,
  })), [
    {
      src: "https://cache.invalid/double.png",
      persistent: true,
      alt: "双笑",
      title: "双表情",
      style: { width: 40, height: 18 },
      className: "danmaku-inline-emot",
    },
    {
      src: "https://cache.invalid/special.png",
      persistent: false,
      alt: "[x]+.",
      title: "[x]+.",
      style: { width: 20, height: 20 },
      className: "danmaku-inline-emot",
    },
  ]);
  assert.match(markup, /前<img[^>]+>后<img/);
  assert.equal(isEmoticonOnlyContent(" [哈][哈] [x]+. ", emots), true);
  assert.equal(isEmoticonOnlyContent("正文[哈]", emots), false);
  assert.equal(isEmoticonOnlyContent("[哈]"), false);
});

test("text and hidden emoticon modes preserve surrounding text without resolving images", () => {
  const emots = {
    "[笑]": { url: "smile.png", emoji: "笑脸" },
    "[无图]": { url: "", emoji: "文字表情" },
  };
  const props = {
    content: "前[笑]后[无图]",
    emots,
    resolveImageUrl: () => { throw new Error("text-only rendering should not resolve images"); },
  };
  assert.equal(
    renderToStaticMarkup(createElement(InlineEmotText, { ...props, emoticonStyle: "text" })),
    "前笑脸后文字表情",
  );
  assert.equal(
    renderToStaticMarkup(createElement(InlineEmotText, { ...props, emoticonStyle: "hidden" })),
    "前后",
  );
  assert.equal(
    renderToStaticMarkup(createElement(InlineEmotText, { content: "<正文>" })),
    "&lt;正文&gt;",
  );
});

test("the default browser image consumes the persistent hint and forwards image attributes", () => {
  const markup = renderToStaticMarkup(createElement(DanmakuImage, {
    src: "https://image.invalid/avatar.png",
    alt: "头像",
    title: "用户名",
    persistent: true,
    className: "custom-image",
    style: { width: 24, height: 24 },
  }));
  assert.match(markup, /<img[^>]+alt="头像"/);
  assert.match(markup, /title="用户名"/);
  assert.match(markup, /class="custom-image"/);
  assert.match(markup, /style="width:24px;height:24px"/);
  assert.doesNotMatch(markup, /persistent=/);
});

test("medal badges retain tier boundaries, unlit gray, and scale rounding", () => {
  const levels = [10, 11, 20, 21, 30, 31, 40, 41, 50, 51, 60, 61];
  const colors = [
    "#5963A5", "#C474A4", "#C474A4", "#4AB3E7", "#4AB3E7", "#5781E4",
    "#5781E4", "#A779E6", "#A779E6", "#E05673", "#E05673", "#F08632",
  ];
  for (let index = 0; index < levels.length; index += 1) {
    const markup = renderToStaticMarkup(createElement(MedalBadge, {
      medal: { name: "粉丝", level: levels[index], isLight: 1 },
      scale: 1.5,
    }));
    assert.ok(markup.includes(`background-color:${colors[index]}`));
    assert.match(markup, /font-size:17px;padding:1.5px 7.5px/);
    assert.match(markup, /class="danmaku-medal-badge"/);
    assert.match(markup, /class="danmaku-medal-level"/);
  }
  const unlit = renderToStaticMarkup(createElement(MedalBadge, {
    medal: { name: "粉丝", level: 61, isLight: 0 },
  }));
  assert.match(unlit, /background-color:#919298/);
});
