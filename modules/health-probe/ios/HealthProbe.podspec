Pod::Spec.new do |s|
  s.name           = 'HealthProbe'
  s.version        = '1.0.0'
  s.summary        = 'Checks whether this build can read Apple Health'
  s.description    = 'Checks whether this build can read Apple Health'
  s.license        = 'MIT'
  s.author         = 'Repforge'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.frameworks     = 'HealthKit'

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
