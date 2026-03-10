# 大屏部分修改
- 现在大屏部分动画使用一个png序列
- config.json中配置了motions，每个motion有一个id和一个image文件夹路径
- 每个image文件夹下有多个png文件，文件名是数字，从小开始递增
- 每个motion的png序列循环播放
- 当分数为 0-39，播放 motion_00 序列
- 当分数为 40-79，播放 motion_01 序列
- 当分数为 80-100，播放 motion_02 序列