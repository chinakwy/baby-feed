# Webhook 部署与验证

数据库沿用版本化迁移：Docker 的 `start.sh` 自动执行 `node scripts/migrate.mjs`。已有部署不要临时生成迁移或使用 `prisma db push` 代替迁移。

1. 在 `.env` 设置独立随机 `NEXTAUTH_SECRET` 和 `CRON_SECRET`（各至少32字符），正确设置 `NEXTAUTH_URL`。不要提交 `.env`。
2. `docker compose --profile webhooks up -d --build` 同时启动应用与无数据库访问权限的周期 Runner。Runner 每次完成后等待60秒；仅一组 Runner，失败只记录状态。未启用 profile 时须自行调用下述接口，否则持久队列不会自动重试。仅启用 profile 时必须提供 CRON_SECRET；空值会使 Runner 明确退出，普通应用仍可运行。
3. 创建 Webhook：`POST /api/webhooks`，正文包含 `url` 与 `events`，例如 `["feeding.created","reminder.fired"]`。密钥仅创建时返回，安全保存。
4. `GET /api/cron/webhook-runner` 携带 `Authorization: Bearer <CRON_SECRET>`，最多每分钟两次，每批最多100条。未配置返回503，密钥错误401，限流429。此密钥可处理全站队列，不能交给普通 Agent。请求可能串行处理100条（每条最多5秒DNS加10秒传输），反向代理需允许足够处理时长；大量积压时应降低批量或另行优化，不要提高并发绕过租约。
5. 用模拟用户和记录验证：事件入队、签名验证、接收方先失败再成功、到期重试、重复去重、停用目标取消、跨用户不可见。

Webhook Runner 仅处理投递队列，不负责生成提醒；提醒依靠 Node instrumentation 中的 reminder scheduler，只有数据库所属单实例启用 `REMINDER_ENABLED=true`，其他实例关闭。

目标必须解析到公共单播地址；内网、回环、链路本地、映射IPv6等会被发送层拒绝；拒绝重定向。没有内网放行开关。不要用公网代理绕过此限制访问家庭服务。

参见 [协议与可靠性](WEBHOOKS.md) 和 [API / Agent 接入](API_AGENT_INTEGRATION.md)。本地 Mac 管理脚本不属于 Docker，此配置更新不会自动启用 Mac 定时任务。
