const fs = require('fs');

const {
  IOSConfig,
  createRunOncePlugin,
  withEntitlementsPlist,
  withFinalizedMod,
} = require('expo/config-plugins');
const plist = require('@expo/plist').default;

function removePushEntitlement(entitlements) {
  delete entitlements['aps-environment'];
  return entitlements;
}

const withLocalNotificationsOnly = (config) => {
  config = withEntitlementsPlist(config, (modConfig) => {
    modConfig.modResults = removePushEntitlement(modConfig.modResults);
    return modConfig;
  });

  return withFinalizedMod(config, [
    'ios',
    (modConfig) => {
      const entitlementsPath = IOSConfig.Entitlements.getEntitlementsPath(
        modConfig.modRequest.projectRoot
      );

      if (entitlementsPath) {
        const entitlements = plist.parse(fs.readFileSync(entitlementsPath, 'utf8'));
        removePushEntitlement(entitlements);
        fs.writeFileSync(entitlementsPath, plist.build(entitlements));
      }

      return modConfig;
    },
  ]);
};

module.exports = createRunOncePlugin(
  withLocalNotificationsOnly,
  'with-local-notifications-only',
  '1.0.0'
);
