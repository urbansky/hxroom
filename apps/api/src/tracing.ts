import { NodeSDK, tracing } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OUTGOING_REDACTED_QUERY_PARAMS, QueryTokenRedactionSpanProcessor } from './tracing-redaction';

const sdk = new NodeSDK({
  // Statt `traceExporter`, weil neben dem Export ein zweiter Processor gebraucht wird:
  // Der Klienten-Token steht als ?token=… in der URL und würde sonst über die
  // Span-Attribute im Trace-Backend landen (siehe tracing-redaction.ts). Er läuft vor
  // dem Batch-Processor und räumt jeden Span beim Start auf – exportiert wird nur, was
  // durch ihn hindurch ist.
  spanProcessors: [
    new QueryTokenRedactionSpanProcessor(),
    // Endpoint kommt aus OTEL_EXPORTER_OTLP_ENDPOINT
    new tracing.BatchSpanProcessor(new OTLPTraceExporter()),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        // Ausgehende Requests: Dafür bringt die HTTP-Instrumentierung eine eigene
        // Redaction mit, die die Werte gar nicht erst in ein Attribut schreibt.
        redactedQueryParams: [...OUTGOING_REDACTED_QUERY_PARAMS],
      },
    }),
  ],
});

sdk.start();
