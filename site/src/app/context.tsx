"use client";

import { createContext, useContext as useReactContext, useMemo } from "react";

type ContextType = {
  macUrl: string;
  windowsUrl: string;
  linuxUrl: string;
};

const Context = createContext<ContextType>({
  macUrl: "/",
  windowsUrl: "/",
  linuxUrl: "/",
});

export const ContextProvider: React.FC<
  React.PropsWithChildren<ContextType>
> = ({ macUrl, windowsUrl, linuxUrl, children }) => {
  const memoContextValue = useMemo(
    () => ({ macUrl, windowsUrl, linuxUrl }),
    [macUrl, windowsUrl, linuxUrl],
  );
  return (
    <Context.Provider value={memoContextValue}>{children}</Context.Provider>
  );
};

export function useContext(): ContextType {
  const context = useReactContext(Context);

  if (context === undefined) {
    throw new Error(`useContext must be used within a ${name}Provider`);
  }

  return context;
}
