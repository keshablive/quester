/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      build: 'npx expo run:ios --configuration Debug',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/client.app'
    },
    'ios.release': {
      type: 'ios.app',
      build: 'npx expo run:ios --configuration Release',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/client.app'
    },
    'android.debug': {
      type: 'android.apk',
      build: 'npx expo run:android --variant debug',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      reversePorts: [8081]
    },
    'android.release': {
      type: 'android.apk',
      build: 'npx expo run:android --variant release',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15 Pro'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
