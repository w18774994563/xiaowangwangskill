# 飞书多维表格转网站

这是一个静态作品集站点，前台通过 `api/portfolio.json` 渲染，后续可用 `refresh.py` 从飞书多维表格刷新媒体临时链接。

## 当前状态

- 已完成科技动态感前端页面
- 已接入分类筛选、卡片列表、弹层播放、滚动动画、背景动画
- 已放入 `refresh.py` 与 `.github/workflows/refresh.yml`
- 当前 `api/*.json` 为演示数据，因为你给的飞书链接需要登录后才能读取真实记录

## 本地预览

直接打开 [index.html](./index.html) 即可，或者在当前目录启动一个静态服务器。

## 接入真实飞书数据

需要以下 4 个环境变量或 GitHub Secrets：

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_BASE_TOKEN`
- `LARK_TABLE_ID`

其中这次链接里已经能确认：

- `LARK_BASE_TOKEN=Ms02bcfeiaWmxaspVh1crCb3nRg`
- `LARK_TABLE_ID=tblKP27obsIVGcac`

还缺：

- 飞书应用 `App ID`
- 飞书应用 `App Secret`

## 刷新命令

```bash
python refresh.py
```

脚本会输出：

- `api/portfolio.json`
- `api/videos.json`
- `api/covers.json`

## GitHub Pages

仓库部署后，把以下 Secrets 配进 GitHub：

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_BASE_TOKEN`
- `LARK_TABLE_ID`

然后手动触发 `.github/workflows/refresh.yml` 一次，确认 JSON 已更新。
