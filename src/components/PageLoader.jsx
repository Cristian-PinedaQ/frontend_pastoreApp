import React from "react";
import { Loader2 } from "lucide-react";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="text-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
        Cargando...
      </p>
    </div>
  </div>
);

export default PageLoader;
