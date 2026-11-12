use danmaku_core::protocol::{
    decode_packets, make_packet, parse_danmaku_events, ParsedPacket, OP_SEND_MSG,
};
use danmaku_core::{DanmakuEvent, Medal};
use serde_json::json;

#[test]
fn public_packet_parser_preserves_the_event_json_contract() {
    let command = json!({
        "cmd": "DANMU_MSG",
        "info": [
            [0, 1, 25, 16_777_215, 1_723_979_200_649u64, 42],
            "公共解析测试",
            [123, "测试用户", 1]
        ]
    });
    let packet = make_packet(&serde_json::to_vec(&command).unwrap(), OP_SEND_MSG).unwrap();
    let decoded = decode_packets(&packet).unwrap();
    let [ParsedPacket::Command(decoded_command)] = decoded.as_slice() else {
        panic!("expected one command packet, got {decoded:?}");
    };
    assert_eq!(decoded_command, &command);

    let events: Vec<DanmakuEvent> = parse_danmaku_events(decoded_command, 7);
    assert_eq!(events.len(), 1);

    // 三个按需字段省略，其余可选字段仍保留 JSON null。
    let expected = json!({
        "id": "42",
        "roomId": 7,
        "type": "danmaku",
        "username": "测试用户",
        "content": "公共解析测试",
        "timestamp": 1_723_979_200u64,
        "avatar": null,
        "medal": null,
        "wealthLevel": null,
        "uid": 123,
        "color": 16_777_215,
        "guardLevel": 0,
        "isAdmin": true,
        "dmType": 0,
        "price": null,
        "giftName": null,
        "count": null,
        "backgroundColor": null,
        "backgroundBottomColor": null,
        "backgroundPriceColor": null,
        "messageFontColor": null,
        "backgroundImage": null,
        "emots": null,
        "emoticonOptions": null,
        "replyUid": null,
        "replyUsername": null
    });
    assert_eq!(serde_json::to_value(&events[0]).unwrap(), expected);

    let without_optional_fields = json!({
        "id": "42",
        "roomId": 7,
        "type": "danmaku",
        "username": "测试用户",
        "content": "公共解析测试",
        "timestamp": 1_723_979_200u64,
        "uid": 123,
        "color": 16_777_215,
        "guardLevel": 0,
        "isAdmin": true,
        "dmType": 0
    });
    let restored: DanmakuEvent = serde_json::from_value(without_optional_fields).unwrap();
    assert_eq!(serde_json::to_value(restored).unwrap(), expected);
}

#[test]
fn populated_optional_fields_round_trip_through_the_public_model() {
    let payload = json!({
        "id": "sc-42",
        "roomId": 7,
        "type": "superChat",
        "username": "测试用户",
        "content": "原文",
        "contentTrans": "译文",
        "timestamp": 1_723_979_200u64,
        "avatar": "avatar.png",
        "medal": { "name": "勋章", "level": 12, "isLight": 1 },
        "wealthLevel": 20,
        "uid": 123,
        "color": 16_777_215,
        "guardLevel": 3,
        "isAdmin": false,
        "dmType": 1,
        "price": 30,
        "giftName": "醒目留言",
        "count": 1,
        "backgroundColor": "#EDF5FF",
        "backgroundBottomColor": "#2A60B2",
        "backgroundPriceColor": "#7497CD",
        "messageFontColor": "#000000",
        "backgroundImage": "background.png",
        "emots": { "[表情]": { "url": "emoticon.png" } },
        "emoticonOptions": { "width": 32, "height": 32 },
        "replyUid": 456,
        "replyUsername": "回复对象",
        "contributionRank": 2,
        "bubbleColor": "#1453BAFF,#3353BAFF,#3353BAFF"
    });
    let event: DanmakuEvent = serde_json::from_value(payload.clone()).unwrap();
    let medal: &Medal = event.medal.as_ref().expect("medal should deserialize");
    assert_eq!(medal.is_light, 1);
    assert_eq!(event.content_trans.as_deref(), Some("译文"));
    assert_eq!(event.contribution_rank, Some(2));
    assert_eq!(
        event.bubble_color.as_deref(),
        Some("#1453BAFF,#3353BAFF,#3353BAFF")
    );
    assert_eq!(serde_json::to_value(event).unwrap(), payload);
}
