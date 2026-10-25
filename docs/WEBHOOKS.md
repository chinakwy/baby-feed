# Webhook 协议与可靠性

## 事件与管理

支持 `feeding.created/updated/deleted`、`health.created/updated/deleted`、`memo.created/updated/deleted`、`reminder.fired`、`user.deleted`；`*` 订阅全部。健康事件包含自定义营养快照。宝宝资料、营养目录、头像和普通设置变更不产生独立事件。`user.deleted` 仅管理员删除路径向操作者订阅发出；不是被删用户可靠接收的通知，自助注销不发该事件。

- `/api/webhooks` GET/POST：当前用户端点列表/创建，secret仅创建返回。
- `/api/webhooks/:id` PUT/DELETE：当前用户修改/删除。
- `/api/webhooks/deliveries` GET/DELETE：当前用户投递记录/清理已完成记录，不能用清理操作删除待处理队列。
- `/api/cron/webhook-runner` GET：独立 CRON_SECRET，处理全站到期队列。

配置 `maxRetries` 为0–10（应为整数），`retryDelay` 为10–3600秒。当前实现的 `maxRetries` **是最多总尝试数**，0仍会发送首次；默认5即最多5次。失败使用指数退避，具体上限见 `calculateRetryDelayMs`。HTTP非2xx（包括3xx与4xx）均视为失败。成功不保存响应正文，避免泄密和无界响应内存。

## 签名

正文为UTF-8 JSON，字段包含 `id,type,timestamp,userId,data`。原始正文最大100KiB。

`X-Webhook-Signature = hex(HMAC-SHA256(secret, rawBodyBytes))`，没有 `sha256=` 前缀。接收端必须先对原始字节恒定时间验签，再解析JSON。不要重新序列化后验签。另有 `X-Webhook-Event-Type`、`X-Webhook-Event-ID`、`X-Webhook-Delivery-ID`、`X-Webhook-Timestamp`；这些头不包含在签名内。以签名正文中的type/id为准，不能单靠头部时间防重放。正文timestamp是事件产生时间，可能因重试较旧；不要用短时间窗口拒绝合法延迟事件。

## 队列、隔离与限制

事件与其端点投递在一次数据库嵌套写入中创建。首次立即异步尝试，后续必须靠Runner；30秒租约和leaseToken确保最终更新归属，进程崩溃后可回收过期租约。投递前核对事件、目标和delivery用户一致，检查目标启用状态与提醒是否仍有效。每次连接重新解析DNS，拒绝任何非公共地址答案，socket固定到已校验地址，不跟随重定向。

采用**至少一次**交付：远端已处理但响应丢失时会再次发送相同event ID / delivery ID。接收端持久化去重，外部副作用也要使用event ID作为幂等键。本项目示例接收器含SQLite去重，但无法原子提交跨服务副作用，不能承诺恰好一次。发送API创建记录没有Idempotency-Key，不要自动重试POST；超时先查询确认。

业务记录事务与事件入队尚未原子绑定，入队失败仅记录错误，可能漏事件；必要时由API增量对账。没有后台无限补发、自动失败重放或全局队列保留期限。日志清理和数据保留需要运维安排。API Key活动日志为进程内、有上限/过期策略，重启会丢失，且success表示认证成功，不表示最终业务成功。

## 隐私

事件有宝宝姓名/生日、健康数据、备注、备忘内容，`user.deleted`可含邮箱。只向自己控制、确需数据的目标订阅必要事件，优先HTTPS。HTTP仍为兼容保留，正文和签名缺乏传输保密。目标URL不要包含密码、token或敏感query（URL会进入配置和投递日志）。生产错误日志只记录错误类型，避免ORM消息包含完整记录正文；开发模式仍可能包含详细内容。secret数据库明文保存以便签名，保护数据库与备份权限。不要把事件正文、接收器数据目录及凭据提交代码仓库。

示例接收器强制WEBHOOK_SECRET、请求大小限制、只按签名正文分发和校验文件路径字段。它会在私有DATA_DIR保存完整事件与去重状态，部署者负责目录权限/保留期和鉴权隔离，不应向公网暴露事件流文件。支持单个endpoint secret，多个租户需分别部署或实现按端点隔离密钥。
