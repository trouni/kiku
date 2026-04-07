import { createStore } from "solid-js/store";
import { generateHydrationScript, renderToString } from "solid-js/web";
import { Front } from "#/components/Front";
import { Layout } from "#/components/Layout";
import { AnkiFieldContextProvider } from "#/components/shared/AnkiFieldsContext";
import { CacheContextProvider } from "#/components/shared/CacheContext";
import { CardStoreContextProvider } from "#/components/shared/CardContext";
import { ConfigContextProvider } from "#/components/shared/ConfigContext";
import { CtxContextProvider } from "#/components/shared/CtxContext";
import {
  FieldGroupContextProvider,
  RootFieldGroupContextProvider,
} from "#/components/shared/FieldGroupContext";
import { GeneralContextProvider } from "#/components/shared/GeneralContext";
import { Logger } from "#/util/logger";
import { ankiFieldsSkeleton } from "#/util/types";
import { Back } from "../src/components/Back";
import { BreakpointContextProvider } from "../src/components/shared/BreakpointContext";
import { defaultConfig } from "../src/util/default-config";

const [config, setConfig] = createStore(defaultConfig);

const logger = new Logger();
const aborter = new AbortController();

export function generateSsrTemplate() {
  const frontSsrTemplate = renderToString(() => (
    <BreakpointContextProvider>
      <CacheContextProvider cacheStore={{}}>
        <GeneralContextProvider
          aborter={aborter}
          isAnkiWeb={false}
          isAnkiDesktop={false}
          workerPath={undefined}
          templateDataset={{}}
          ankiDroidAPI={undefined}
          startupTime={() => 0}
          assetsPath=""
          logger={logger}
          root={undefined}
        >
          <ConfigContextProvider value={[config, setConfig]}>
            <AnkiFieldContextProvider ankiFields={ankiFieldsSkeleton}>
              <CardStoreContextProvider side="front" cardType="mining">
                <FieldGroupContextProvider>
                  <RootFieldGroupContextProvider>
                    <CtxContextProvider>
                      <Layout>
                        <Front />
                      </Layout>
                    </CtxContextProvider>
                  </RootFieldGroupContextProvider>
                </FieldGroupContextProvider>
              </CardStoreContextProvider>
            </AnkiFieldContextProvider>
          </ConfigContextProvider>
        </GeneralContextProvider>
      </CacheContextProvider>
    </BreakpointContextProvider>
  ));
  const clozeFrontSsrTemplate = renderToString(() => (
    <BreakpointContextProvider>
      <CacheContextProvider cacheStore={{}}>
        <GeneralContextProvider
          aborter={aborter}
          isAnkiWeb={false}
          isAnkiDesktop={false}
          workerPath={undefined}
          templateDataset={{}}
          ankiDroidAPI={undefined}
          startupTime={() => 0}
          assetsPath=""
          logger={logger}
          root={undefined}
        >
          <ConfigContextProvider value={[config, setConfig]}>
            <AnkiFieldContextProvider ankiFields={ankiFieldsSkeleton}>
              <CardStoreContextProvider side="front" cardType="cloze">
                <FieldGroupContextProvider>
                  <RootFieldGroupContextProvider>
                    <CtxContextProvider>
                      <Layout>
                        <Front />
                      </Layout>
                    </CtxContextProvider>
                  </RootFieldGroupContextProvider>
                </FieldGroupContextProvider>
              </CardStoreContextProvider>
            </AnkiFieldContextProvider>
          </ConfigContextProvider>
        </GeneralContextProvider>
      </CacheContextProvider>
    </BreakpointContextProvider>
  ));
  const backSsrTemplate = renderToString(() => (
    <BreakpointContextProvider>
      <CacheContextProvider cacheStore={{}}>
        <GeneralContextProvider
          aborter={aborter}
          isAnkiWeb={false}
          isAnkiDesktop={false}
          workerPath={undefined}
          templateDataset={{}}
          ankiDroidAPI={undefined}
          startupTime={() => 0}
          assetsPath=""
          logger={logger}
          root={undefined}
        >
          <ConfigContextProvider value={[config, setConfig]}>
            <AnkiFieldContextProvider ankiFields={ankiFieldsSkeleton}>
              <CardStoreContextProvider side="back">
                <FieldGroupContextProvider>
                  <RootFieldGroupContextProvider>
                    <CtxContextProvider>
                      <Layout>
                        <Back />
                      </Layout>
                    </CtxContextProvider>
                  </RootFieldGroupContextProvider>
                </FieldGroupContextProvider>
              </CardStoreContextProvider>
            </AnkiFieldContextProvider>
          </ConfigContextProvider>
        </GeneralContextProvider>
      </CacheContextProvider>
    </BreakpointContextProvider>
  ));

  const hydrationScript = generateHydrationScript();

  const result = {
    frontSsrTemplate,
    clozeFrontSsrTemplate,
    backSsrTemplate,
    hydrationScript,
  };
  return result;
}
