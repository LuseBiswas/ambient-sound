const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withKotlinVersion(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    // Bump kotlinVersion in ext block
    contents = contents.replace(
      /kotlinVersion\s*=\s*["'][^"']*["']/,
      'kotlinVersion = "1.9.25"'
    );

    // Suppress the Compose compiler/Kotlin version compatibility check
    // across ALL subprojects (including expo-modules-core)
    if (!contents.includes('suppressKotlinVersionCompatibilityCheck')) {
      contents = contents.trimEnd() + `

allprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += [
                "-P",
                "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=1.9.24"
            ]
        }
    }
}
`;
    }

    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
};
