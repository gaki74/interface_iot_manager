This software is released under the MIT License, see LICENSE.

# IoTデバイス向けデータ収集サーバ

このソフトウェアは、IoTデバイスからクラウド基盤上へデータを転送したり、クラウド基盤上からIoTデバイスへ指示を出したりすることを学ぶために開発しました。
上記を実際に運用する際は、このソフトウェアではなく、広く使用されているクラウドサービス等を活用するようにしてください。

ソフトウェアの詳細な説明につきましては、本誌をご参照ください。

## 拡張機能

本レポジトリーのfeatureブランチでは、本誌に書ききれなかった拡張機能を実装しています。

|ブランチ|実装した機能|備考|
|:-|:-|:-|
|[feature/chartjs](/gaki74/interface_iot_manager/tree/feature/chartjs)|グラフの表示機能|`http://(中略).com/chart.html`へアクセスしてください。|
|[feature/hardening](/gaki74/interface_iot_manager/tree/feature/hardening)|余分な機能の削除||
|[feature/momentjs](/gaki74/interface_iot_manager/tree/feature/momentjs)|今週のデータの表示機能|`http://(中略).com/sensors/[センサーのID]/data_this_week`へアクセスしてください。|
|[feature/mqtt](/gaki74/interface_iot_manager/tree/feature/mqtt)|データ受信時にMQTTブローカーと通信する機能|MQTTブローカーは別途準備してください。|
|[develop](/gaki74/interface_iot_manager/tree/develop)|上記機能をすべて統合||
