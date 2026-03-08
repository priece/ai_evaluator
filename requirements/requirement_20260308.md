# 需求 20260308
- 后端用ffmpeg生成音频序列 audio_sequence.wav，纯音频PCM
- 放到 audio 目录下
- 音频采样率8000Hz，单声道，2秒一个切片
- 前端在视频监看区域下面，放一个音频控件，从后端请求读取 audio_sequence.wav 文件，就用 wavesurfer 展示波形
- 增加API接口，/api/audio/last，返回最后一个 audio_sequence.wav 文件
- 如果音频文件不存在，则不展示
- audio目录中，只保留10个音频文件，超过10个则删除最早的