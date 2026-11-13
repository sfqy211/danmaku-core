import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DanmakuMessageItem } from "../dist/DanmakuMessageItem.js";

const BASE_MESSAGE = {
  id: "message-1",
  roomId: 7,
  type: "danmaku",
  username: "条目测试用户",
  content: "普通弹幕正文",
  timestamp: 1_723_979_200,
  uid: 123,
};

function renderMessage(item, props = {}) {
  return renderToStaticMarkup(createElement(DanmakuMessageItem, { item, ...props }));
}

function captureImages() {
  const images = [];
  function Image(props) {
    images.push(props);
    return createElement("img", { src: props.src, alt: props.alt });
  }
  return { images, Image };
}

test("medal settings preserve independent wealth, fan, admin, rank and username gates", () => {
  const item = {
    ...BASE_MESSAGE,
    medal: { name: "星际粉丝牌", level: 21, isLight: 1 },
    wealthLevel: 7,
    isAdmin: true,
    contributionRank: 2,
    guardLevel: 3,
  };
  const visible = captureImages();
  const markup = renderMessage(item, { imageComponent: visible.Image });
  assert.match(markup, /星际粉丝牌/);
  assert.match(markup, />房</);
  assert.match(markup, /榜2/);
  assert.match(markup, /条目测试用户/);
  assert.deepEqual(visible.images.map(({ src }) => src), ["wealth-level://7"]);

  const noMedals = captureImages();
  const noMedalsMarkup = renderMessage(item, {
    imageComponent: noMedals.Image,
    appearance: { showMedal: false },
  });
  assert.doesNotMatch(noMedalsMarkup, /星际粉丝牌/);
  assert.equal(noMedals.images.length, 0);
  assert.match(noMedalsMarkup, />房</);
  assert.match(noMedalsMarkup, /榜2/);
  assert.match(noMedalsMarkup, /条目测试用户/);

  const noWealth = captureImages();
  assert.match(renderMessage(item, {
    imageComponent: noWealth.Image,
    appearance: { hideGloryLevel: true },
  }), /星际粉丝牌/);
  assert.equal(noWealth.images.length, 0);

  const noFan = captureImages();
  assert.doesNotMatch(renderMessage(item, {
    imageComponent: noFan.Image,
    appearance: { hideFanMedal: true },
  }), /星际粉丝牌/);
  assert.deepEqual(noFan.images.map(({ src }) => src), ["wealth-level://7"]);

  const plainUsername = renderMessage(item, { appearance: { hideUserIdColor: true } });
  assert.match(plainUsername, /danmaku-username-plain/);
  assert.doesNotMatch(plainUsername, /danmaku-username-captain/);

  const hidden = renderMessage(item, {
    appearance: {
      showMedal: false,
      hideAdminBadge: true,
      hideContributionRank: true,
      hideUsername: true,
      hideUserIdColor: true,
    },
  });
  const hiddenText = hidden.replace(/<[^>]*>/g, "");
  assert.doesNotMatch(hiddenText, /星际粉丝牌|房|榜2|条目测试用户/);
  assert.match(hiddenText, /普通弹幕正文/);
});

test("hidden emoticons remove pure-emoticon rows and preserve surrounding ordinary text", () => {
  const emots = { "[笑]": { url: "smile.png", emoji: "笑脸" } };
  const options = { emoticonUnique: "official_smile", url: "big.png", width: 120, height: 80 };
  const hidden = { appearance: { emoticonStyle: "hidden" } };
  assert.equal(renderMessage({ ...BASE_MESSAGE, content: " [笑] [笑] ", emots }, hidden), "");
  assert.equal(renderMessage({ ...BASE_MESSAGE, dmType: 1, emoticonOptions: options }, hidden), "");
  assert.match(renderMessage({ ...BASE_MESSAGE, content: "前[笑]后", emots }, hidden), /前后/);

  const text = renderMessage({ ...BASE_MESSAGE, content: "前[笑]后", emots }, {
    appearance: { emoticonStyle: "text" },
  });
  assert.match(text, /前笑脸后/);
  assert.doesNotMatch(text, /<img/);
  const bigText = renderMessage({ ...BASE_MESSAGE, content: "[大表情]", dmType: 1, emoticonOptions: options }, {
    appearance: { emoticonStyle: "text" },
  });
  assert.match(bigText, /\[大表情\]/);
  assert.doesNotMatch(bigText, /<img/);
});

test("large emoticons retain official size caps, custom size and original cache identity", () => {
  const official = captureImages();
  renderMessage({
    ...BASE_MESSAGE,
    dmType: 1,
    emoticonOptions: { emoticonUnique: "official_smile", url: "big.png", width: 120, height: 28 },
  }, {
    fontSize: 21,
    cachedEmotUrls: new Set(["big.png"]),
    imageComponent: official.Image,
    resolveImageUrl: (url) => `https://cache.invalid/${url}`,
  });
  assert.equal(official.images.length, 1);
  assert.equal(official.images[0].src, "https://cache.invalid/big.png");
  assert.equal(official.images[0].persistent, true);
  assert.deepEqual(official.images[0].style, { width: 84, height: 42 });

  const custom = captureImages();
  renderMessage({
    ...BASE_MESSAGE,
    dmType: 1,
    emoticonOptions: { emoticonUnique: "fan_smile", url: "custom.png", width: 120, height: 80 },
  }, { fontSize: 21, imageComponent: custom.Image });
  assert.deepEqual(custom.images[0].style, { width: 72, height: 72 });
  assert.equal(custom.images[0].persistent, false);
});

test("gift, SC and guard rows retain total amounts, content and plain-price settings", () => {
  const gift = {
    ...BASE_MESSAGE,
    type: "gift",
    content: "投喂了小电视飞船",
    giftName: "小电视飞船",
    price: 128_000,
    count: 2,
  };
  const giftMarkup = renderMessage(gift);
  assert.match(giftMarkup, /¥256/);
  assert.match(giftMarkup, /小电视飞船/);
  assert.match(giftMarkup, /×2/);
  assert.doesNotMatch(giftMarkup, /投喂了/);
  assert.match(giftMarkup, /--sc-accent:#D4464A/);
  const plainGift = renderMessage(gift, { appearance: { plainPriceMessages: true } });
  assert.match(plainGift, /¥256/);
  assert.match(plainGift, /小电视飞船/);
  assert.match(plainGift, /×2/);
  assert.doesNotMatch(plainGift, /--sc-accent:/);

  const sc = renderMessage({
    ...BASE_MESSAGE,
    type: "superChat",
    price: 100,
    count: 2,
    content: "醒目留言原文",
    contentTrans: "醒目留言译文",
    contributionRank: 1,
  });
  assert.match(sc, /¥100/);
  assert.match(sc, /醒目留言原文/);
  assert.match(sc, /／/);
  assert.match(sc, /醒目留言译文/);
  assert.doesNotMatch(sc, /榜1/);

  const guard = renderMessage({ ...BASE_MESSAGE, type: "guard", giftName: "舰长", price: 138_000, count: 1, guardLevel: 3 });
  assert.match(guard, /¥138/);
  assert.match(guard, /舰长/);
  assert.doesNotMatch(guard, /×1/);
});

test("bubble variables retain Android alpha conversion and the hide setting", () => {
  const item = { ...BASE_MESSAGE, bubbleColor: "#1453BAFF,#3353BAFF,#3353BAFF" };
  const markup = renderMessage(item, { theme: "dark" });
  assert.match(markup, /data-theme="dark"/);
  assert.match(markup, /--bubble-start:#53baff14/);
  assert.match(markup, /--bubble-end:#53baff33/);
  assert.match(markup, /--bubble-border:#53baff33/);
  const hidden = renderMessage(item, { appearance: { hideBubbleColor: true }, theme: "light" });
  assert.match(hidden, /data-theme="light"/);
  assert.doesNotMatch(hidden, /--bubble-(?:start|end|border):/);
  assert.doesNotMatch(renderMessage({ ...item, bubbleColor: "#1453BAFF,invalid" }), /--bubble-start:/);
  assert.doesNotMatch(renderMessage({ ...item, type: "gift", giftName: "免费礼物" }), /--bubble-start:/);
});
