const { withPodfile } = require("@expo/config-plugins");

const PATCH_START = "# @generated begin ios-xcode26-build-fixes";
const PATCH_END = "# @generated end ios-xcode26-build-fixes";
const SWIFT_FLAG = "-Xfrontend -disable-autolink-framework -Xfrontend SwiftUICore";

const buildPatch = () =>
  [
    PATCH_START,
    " # Xcode 26: patch fmt consteval when building React Native from source.",
    " if podfile_properties['ios.buildReactNativeFromSource'] == 'true'",
    "   fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')",
    "   if File.exist?(fmt_base)",
    "     content = File.read(fmt_base)",
    "     unless content.include?('Xcode 26 workaround')",
    "       patched = content.gsub(",
    "         /#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL 1/,",
    '         "#elif defined(__cpp_consteval)\\n// Xcode 26 workaround: disable consteval\\n#  define FMT_USE_CONSTEVAL 0"',
    "       )",
    "       if patched != content",
    "         File.chmod(0644, fmt_base)",
    "         File.write(fmt_base, patched)",
    "       end",
    "     end",
    "   end",
    " end",
    "",
    " # iOS 26 / Xcode 26: SwiftUI split into SwiftUI + private SwiftUICore.",
    " # Must run after react_native_post_install so flags are not overwritten.",
    " if ENV['EXPO_TV'] != '1'",
    "   installer.pods_project.targets.each do |target|",
    "     target.build_configurations.each do |cfg|",
    "       existing = cfg.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'",
    "       existing = existing.join(' ') if existing.is_a?(Array)",
    "       unless existing.include?('-disable-autolink-framework -Xfrontend SwiftUICore')",
    // Bake SWIFT_FLAG into the Ruby string (do not emit #{SWIFT_FLAG} — Ruby treats that as a constant).
    `         cfg.build_settings['OTHER_SWIFT_FLAGS'] = "\#{existing} ${SWIFT_FLAG}"`,
    "       end",
    "     end",
    "   end",
    "",
    "   installer.aggregate_targets.each do |agg|",
    "     next unless agg.user_project",
    "     agg.user_project.native_targets.each do |target|",
    "       target.build_configurations.each do |cfg|",
    "         existing = cfg.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'",
    "         existing = existing.join(' ') if existing.is_a?(Array)",
    "         unless existing.include?('-disable-autolink-framework -Xfrontend SwiftUICore')",
    `           cfg.build_settings['OTHER_SWIFT_FLAGS'] = "\#{existing} ${SWIFT_FLAG}"`,
    "         end",
    "       end",
    "     end",
    "     agg.user_project.save",
    "   end",
    " end",
    PATCH_END,
  ].join("\n");

const withIosSwiftUICoreFix = (config) =>
  withPodfile(config, (cfg) => {
    let podfile = cfg.modResults.contents;
    const patch = buildPatch();

    if (podfile.includes(PATCH_START)) {
      podfile = podfile.replace(new RegExp(`${PATCH_START}[\\s\\S]*?${PATCH_END}`), patch);
    } else if (/react_native_post_install\([\s\S]*?\)\n/m.test(podfile)) {
      podfile = podfile.replace(
        /react_native_post_install\([\s\S]*?\)\n/m,
        (match) => `${match}\n${patch}\n`,
      );
    } else if (/^\s*post_install\s+do\s+\|installer\|/m.test(podfile)) {
      podfile = podfile.replace(
        /^\s*post_install\s+do\s+\|installer\|.*$/m,
        (match) => `${match}\n${patch}`,
      );
    } else {
      podfile += `

post_install do |installer|
${patch}
end
`;
    }

    cfg.modResults.contents = podfile;
    return cfg;
  });

module.exports = withIosSwiftUICoreFix;
