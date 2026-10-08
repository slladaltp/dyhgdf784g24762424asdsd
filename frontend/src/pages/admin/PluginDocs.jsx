import { Code2 } from "lucide-react";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ENDPOINTS = [
  ["GET", "/plugin/deliveries", "Забрать ожидающие выдачи (до 50). Без подтверждения выдача вернётся повторно через 5 минут.",
    `[{ "id": "…", "order_id": "…", "player": "Steve", "product": "VIP", "command": "lp user Steve parent add vip" }]`],
  ["POST", "/plugin/deliveries/{id}/ack", "Подтвердить выдачу после выполнения команды. Повторное подтверждение безопасно.",
    `{ "success": true, "response": "текст из консоли" }`],
  ["POST", "/plugin/heartbeat", "Отправлять онлайн сервера раз в 30–60 секунд — он отображается на сайте.",
    `{ "online": 124, "max_players": 500 }`],
];

const Endpoint = ([method, path, text, body]) => (
  <div key={path} className="border-t border-white/10 pt-4" data-testid={`plugin-doc-${method.toLowerCase()}-${path.split("/")[2]}`}>
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      <span className={`px-2 py-0.5 ${method === "GET" ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-300"}`}>{method}</span>
      <span className="text-white break-all">{path}</span>
    </div>
    <p className="text-sm text-zinc-300 mt-2">{text}</p>
    <pre className="mt-2 bg-black/40 border border-white/5 p-3 text-xs text-zinc-300 overflow-x-auto">{body}</pre>
  </div>
);

export const PluginDocs = () => (
  <section className="mt-10 bg-[#121215] border border-white/10 p-5 lg:p-6 space-y-4" data-testid="plugin-docs">
    <div className="flex items-center gap-3">
      <Code2 size={18} className="text-orange-400" />
      <h2 className="font-display uppercase text-sm">API для плагина автовыдачи</h2>
    </div>
    <p className="text-sm text-zinc-300">
      Переключите сервер в режим «Через плагин (API)» и передавайте его токен в заголовке <span className="font-mono text-orange-300">X-Server-Token</span>.
      Базовый адрес: <span className="font-mono text-white break-all" data-testid="plugin-docs-base">{BASE}</span>
    </p>
    {ENDPOINTS.map(Endpoint)}
  </section>
);
