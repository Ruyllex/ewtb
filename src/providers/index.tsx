"use client";

import { TRPCReactProvider } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { captureException } from "@/lib/sentry";

const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  // Capturar error en Sentry
  if (error) {
    captureException(error, {
      component: "TRPCProviderClient",
      errorBoundary: true,
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Error al cargar la aplicación</h1>
        <p className="text-muted-foreground mb-4">
          Por favor, recarga la página para continuar.
        </p>
        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
};

export const TRPCProviderClient = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ErrorBoundary
      fallbackRender={ErrorFallback}
      onError={(error, errorInfo) => {
        // Capturar error en Sentry con información adicional
        captureException(error, {
          component: "TRPCProviderClient",
          errorBoundary: true,
          errorInfo,
        });
      }}
    >
      <TRPCReactProvider>
        {children}
      </TRPCReactProvider>
    </ErrorBoundary>
  );
};
