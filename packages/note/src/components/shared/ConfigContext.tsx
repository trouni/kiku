import { createContext, createEffect, useContext } from "solid-js";
import type { JSX } from "solid-js/jsx-runtime";
import { type SetStoreFunction, type Store, unwrap } from "solid-js/store";
import {
  getRootDatasetConfig,
  type KikuConfig,
  updateConfigState,
} from "#/util/config";
import { constants } from "#/util/general";
import { AnkiConnect } from "../_kiku_lazy/util/anki-connect";
import { useGeneralContext } from "./GeneralContext";

const ConfigContext =
  createContext<[Store<KikuConfig>, SetStoreFunction<KikuConfig>]>();

export function ConfigContextProvider(props: {
  children: JSX.Element;
  value: [Store<KikuConfig>, SetStoreFunction<KikuConfig>];
}) {
  const [$config] = props.value;
  const [$general, $setGeneral] = useGeneralContext();

  createEffect(() => {
    ({ ...$config });
    $general.logger.debug("Updating config:", $config);
    if (!$general.root) throw new Error("Missing root");
    updateConfigState($general.root, $config, !$general.isAnkiWeb);
    AnkiConnect.changeAddress($config.ankiConnectAddress);
    $general.nex.promise.then((nex) => {
      nex.init({
        constants: constants,
        config: unwrap($config),
        assetsPath: import.meta.env.DEV ? "" : $general.assetsPath,
        preferAnkiConnect: $config.preferAnkiConnect && $general.isAnkiDesktop,
      });
    });

    sessionStorage.setItem(
      constants.key["kiku-config"],
      JSON.stringify($config),
    );
    const rootDataset = getRootDatasetConfig($config);
    const isConfigOutOfSync = Object.entries(rootDataset).some(
      ([key, value]) => {
        return (
          $general.templateDataset[key as keyof typeof rootDataset] !== value
        );
      },
    );
    $setGeneral("isConfigOutOfSync", isConfigOutOfSync);
  });

  return (
    <ConfigContext.Provider value={props.value}>
      {props.children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext() {
  const config = useContext(ConfigContext);
  if (!config) throw new Error("Missing ConfigContext");
  return config;
}

export type UseConfigContext = typeof useConfigContext;
