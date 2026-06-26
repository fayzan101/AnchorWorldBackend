import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from "prom-client";

register.setDefaultLabels({
  service: "anchor-backend",
});

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: "anchor_http_requests_total",
  help: "Total number of HTTP requests handled by the API",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

export const httpRequestDurationSeconds = new Histogram({
  name: "anchor_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const socketConnectedClients = new Gauge({
  name: "anchor_socket_connected_clients",
  help: "Current number of connected Socket.IO clients",
  registers: [register],
});

export const recordHttpRequest = ({
  method,
  route,
  statusCode,
  durationSeconds,
}: {
  method: string;
  route: string;
  statusCode: string;
  durationSeconds: number;
}): void => {
  httpRequestsTotal.inc({ method, route, status_code: statusCode });
  httpRequestDurationSeconds.observe(
    { method, route, status_code: statusCode },
    durationSeconds
  );
};

export const setSocketConnectedClients = (count: number): void => {
  socketConnectedClients.set(count);
};

export { register as metricsRegistry };