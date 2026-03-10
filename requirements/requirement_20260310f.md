# snapshot 和 records 修改
- config.json 中增加配置  useRecord，用来控制是否自动收录 records
- config.json 中增加 useSnapshot配置，用来控制是否自动收录 snapshot
- snapshot的触发启动，是当轮次中点击开始演出按钮之后开始启动snapshot的采集
- snapshot每隔一秒生成一张截图，存放到 snapshot 目录下，需要新建目录，目录名称格式为： s场名_r轮次号_yyyyMMdd
- snapshot每张图的文件名格式为： yyyyMMdd_HHmmss_SSS.png
- snapshot的停止，是当轮次中点击结束演出按钮之后停止snapshot的采集