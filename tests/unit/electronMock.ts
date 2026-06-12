import Module from 'node:module';

interface ElectronMockState {
  userData: string;
  appData: string;
  appPath: string;
  version: string;
}

type ModuleLoad = (request: string, parent?: NodeModule, isMain?: boolean) => unknown;

const state: ElectronMockState = {
  userData: '',
  appData: '',
  appPath: process.cwd(),
  version: '0.0.0-test',
};

const moduleLoader = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleLoader._load;
let installed = false;

export function configureElectronMock(nextState: Partial<ElectronMockState>): void {
  Object.assign(state, nextState);
}

export function installElectronMock(): void {
  if (installed) {
    return;
  }

  moduleLoader._load = ((request: string, parent?: NodeModule, isMain?: boolean): unknown => {
    if (request === 'electron') {
      return {
        app: {
          getPath: (name: string) => {
            if (name === 'userData') {
              return state.userData;
            }
            if (name === 'appData') {
              return state.appData || state.userData;
            }
            throw new Error(`electron.app.getPath(${name}) 未在单元测试桩中配置。`);
          },
          getAppPath: () => state.appPath,
          getVersion: () => state.version,
        },
      };
    }

    return originalLoad(request, parent, isMain);
  }) as ModuleLoad;
  installed = true;
}
