require 'fileutils'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
PROJECT_PATH = File.join(ROOT, 'ScreenTimeDemo.xcodeproj')

FileUtils.rm_rf(PROJECT_PATH)

project = Xcodeproj::Project.new(PROJECT_PATH)

screen_time_group = project.main_group.new_group('ScreenTimeDemo', '.')
app_group = screen_time_group.new_group('App', 'App')
shared_group = screen_time_group.new_group('Shared', 'Shared')
extension_group = screen_time_group.new_group('ReportExtension', 'ReportExtension')
tools_group = screen_time_group.new_group('tools', 'tools')

app_target = project.new_target(:application, 'ScreenTimeDemo', :ios, '16.0')
extension_target = project.new_target(:app_extension, 'ScreenTimeReportExtension', :ios, '16.0')

extension_target.product_type = 'com.apple.product-type.extensionkit-extension'
extension_target.product_reference.path = 'ScreenTimeReportExtension.appex'
extension_target.product_reference.explicit_file_type = 'wrapper.app-extension'

[
  project.build_configuration_list.build_configurations,
  app_target.build_configuration_list.build_configurations,
  extension_target.build_configuration_list.build_configurations
].flatten.each do |config|
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['DEVELOPMENT_TEAM'] = ''
end

app_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.scrolloff.ScreenTimeDemo'
  config.build_settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/ScreenTimeDemo.entitlements'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
  config.build_settings['INFOPLIST_KEY_CFBundleDisplayName'] = 'Screen Time Demo'
  config.build_settings['INFOPLIST_KEY_UIApplicationSceneManifest_Generation'] = 'YES'
  config.build_settings['INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents'] = 'YES'
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks'
  config.build_settings['SUPPORTS_MACCATALYST'] = 'NO'
  config.build_settings['SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD'] = 'NO'
end

extension_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.scrolloff.ScreenTimeDemo.ScreenTimeReportExtension'
  config.build_settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'ReportExtension/ScreenTimeReportExtension.entitlements'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['INFOPLIST_FILE'] = 'ReportExtension/Info.plist'
  config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
  config.build_settings['SKIP_INSTALL'] = 'YES'
  config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
  config.build_settings['SUPPORTS_MACCATALYST'] = 'NO'
  config.build_settings['SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD'] = 'NO'
end

app_files = %w[
  ScreenTimeDemoApp.swift
  ContentView.swift
].map { |path| app_group.new_file(path) }

shared_files = %w[
  ReportContext.swift
].map { |path| shared_group.new_file(path) }

extension_files = %w[
  ScreenTimeReportExtension.swift
  DailyAppUsageReport.swift
  DailyAppUsageView.swift
].map { |path| extension_group.new_file(path) }

[
  app_group.new_file('ScreenTimeDemo.entitlements'),
  extension_group.new_file('Info.plist'),
  extension_group.new_file('ScreenTimeReportExtension.entitlements'),
  tools_group.new_file('generate_project.rb')
]

app_target.add_file_references(app_files + shared_files)
extension_target.add_file_references(extension_files + shared_files)

app_target.add_dependency(extension_target)

embed_phase = app_target.new_copy_files_build_phase('Embed Extensions')
embed_phase.dst_subfolder_spec = '1'
embed_phase.dst_path = 'Extensions'
embed_build_file = embed_phase.add_file_reference(extension_target.product_reference)
embed_build_file.settings = { 'ATTRIBUTES' => ['CodeSignOnCopy', 'RemoveHeadersOnCopy'] }

project.save
