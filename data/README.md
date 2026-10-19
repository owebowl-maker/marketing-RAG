# data 目录

这个目录只存放运行时数据，**除下面列出的示例文件外，其他内容都不会提交到 Git**。

| 文件 | 说明 | 是否提交 |
|---|---|---|
| `glossary.sample.json` | 示例词条，没有正式词条表时使用 | ✅ |
| `glossary-template.csv` | 词条表模板（用 Excel 打开填写） | ✅ |
| `glossary.json` | 正式词条表，由 `npm run glossary:import` 生成 | ❌ |
| `app.db` | SQLite 数据库：会话、消息、反馈 | ❌ |

备份：把整个 `data/` 文件夹复制到安全的地方就可以了。详见 `docs/词条实现与维护.md`。
