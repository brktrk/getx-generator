const vscode = require('vscode');
const replace = require('replace-in-file');
const fs = require('fs');
const path = require('path'); // Güvenli yol işlemleri için path modülü
const utils = require('./utils.js');
var cp = require('child_process');

async function getxInstall() {
    try {
        // pubspec.yaml yolunu al
        var pubspecPath = await utils.getPubspecPath();

        console.log("Raw pubspecPath:", pubspecPath);
        
        // Normalize edilen yolu al
        pubspecPath = path.normalize(pubspecPath).replace(/^\\/, '');
        console.log("Normalized pubspecPath:", pubspecPath);
        
        // Dosyanın varlığını kontrol et
        if (!pubspecPath || !fs.existsSync(pubspecPath)) {
            console.error(`Dosya bulunamadı: ${pubspecPath}`);
            throw new Error(`pubspec.yaml bulunamadı veya yol hatalı: ${pubspecPath}`);
        }
        
        // Yolun klasör kısmını al
        let directoryPath = path.dirname(pubspecPath);
        console.log("Directory Path:", directoryPath);
        var data = fs.readFileSync(pubspecPath, 'utf-8');
        var lines = data.split('\n');

        // Bağımlılıkları kaldır
        cp.exec(`
            cd "${directoryPath}" &&
            flutter pub remove get flutter_spinkit responsive_framework google_fonts flutter_datetime_picker
        `, (err, stdout, stderr) => {
            if (err) {
                console.error('Error during dependency removal:', err);
                return;
            }

            console.log('stdout:', stdout);
            console.log('stderr:', stderr);

            // pubspec.yaml dosyasını tekrar okuyarak güncellenmiş içeriği al
            data = fs.readFileSync(pubspecPath, 'utf-8');
            lines = data.split('\n');

            // Kaldırmak istenen bağımlılıkları `dependencies` ve `dev_dependencies` kısmından temizle
            removeDependencies(lines, 'dependencies');
            removeDependencies(lines, 'dev_dependencies');

            // Yeni bağımlılıkları ekle
            const newDependencies = [
                "  google_fonts: 6.2.1",
                "  responsive_framework: 1.5.1",
                "  get: 4.6.6"
            ];
            // Yeni bağımlılıkları eklemek için ilgili yeri bul ve ekle
            var index = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('dev_dependencies')) {
                    index = i;
                    break;
                }
            }
            lines.splice(index - 1, 0, ...newDependencies);  // Yeni bağımlılıkları ekle
            fs.writeFileSync(pubspecPath, lines.join('\n'), 'utf-8');  // Değişiklikleri kaydet

            // assets ve fonts kısmını kontrol et ve ekle
            addAssetsAndFontsToPubspec(pubspecPath, data);

            // Bağımlılıkları güncelle
            cp.exec(`cd "${directoryPath}" && dart pub upgrade --major-versions`, (upgradeErr, upgradeStdout, upgradeStderr) => {
                if (upgradeErr) {
                    console.error('Error during dependency upgrade:', upgradeErr);
                    return;
                }

                console.log('Dependency upgrade stdout:', upgradeStdout);
                console.log('Dependency upgrade stderr:', upgradeStderr);
            });
        });

        // Proje adını al
        var projectName = lines[0].replace("name: ", "").trim();
        console.log("Project Name:", projectName);

        await moveFile(directoryPath, projectName);

        vscode.window.showInformationMessage('Generate successful');
    } catch (error) {
        console.error("Error in getxInstall:", error.message);
        vscode.window.showErrorMessage(`Error during GetX installation: ${error.message}`);
    }
}

/**
 * Belirtilen bağımlılığı kaldır (dependencies ve dev_dependencies)
 * @param {Array} lines - pubspec.yaml satırları
 * @param {string} section - 'dependencies' veya 'dev_dependencies'
 */
function removeDependencies(lines, section) {
    let inSection = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(section)) {
            inSection = true;  // Başlangıç
        }
        if (inSection && lines[i].includes('flutter:')) {
            inSection = false;  // Bitim, `flutter:` kısmına geldi
        }

        // Kaldırmak istediğiniz bağımlılıklar
        const dependenciesToRemove = [
            'get:',
            'flutter_spinkit:',
            'responsive_framework:',
            'google_fonts:',
            'flutter_datetime_picker:'
        ];

        // Kaldırılması gereken satırları kontrol et ve sil
        if (inSection && dependenciesToRemove.some(dep => lines[i].includes(dep))) {
            lines.splice(i, 1);
            i--;  // Kaldırıldıktan sonra bir satır geri git
        }
    }
}

/**
 * assets ve fonts kısmını pubspec.yaml dosyasına ekler
 * @param {string} pubspecPath - pubspec.yaml dosyasının yolu
 * @param {string} data - pubspec.yaml dosyasının içeriği
 */
function addAssetsAndFontsToPubspec(pubspecPath, data) {
    const assetsSection = "assets:";
    const fontsSection = "fonts:";

    // Eğer assets kısmı yoksa, ekle
    if (!data.includes(assetsSection)) {
        const assetsContent = `
  assets:
    - assets/images/
        `;
        data += assetsContent; // assets kısmını en sona ekliyoruz
        fs.writeFileSync(pubspecPath, data, 'utf-8');
        console.log("Assets section added to pubspec.yaml.");
    }

    // Eğer fonts kısmı yoksa, ekle
    if (!data.includes(fontsSection)) {
        const fontsContent = `
  fonts:
    - family: Outfit
      fonts:
        - asset: assets/fonts/Outfit-Regular.ttf
        - asset: assets/fonts/Outfit-Medium.ttf
        - asset: assets/fonts/Outfit-Bold.ttf
        `;
        data += fontsContent; // fonts kısmını en sona ekliyoruz
        fs.writeFileSync(pubspecPath, data, 'utf-8');
        console.log("Fonts section added to pubspec.yaml.");
    }
}

/**
 * Dosyaları kopyala ve düzenle
 * @param {string} directoryPath
 * @param {string} projectName
 */

async function moveFile(directoryPath, projectName) {
    try {
        vscode.extensions.all.forEach((e) => {
            if (e.id.includes("getx-generator")) {
                const sourcePath = vscode.Uri.file(path.join(e.extensionPath, 'getx_brktrk', 'lib'));
                const destinationPath = vscode.Uri.file(path.join(directoryPath, 'lib'));

                const sourceAssetsPath = vscode.Uri.file(path.join(e.extensionPath, 'getx_brktrk', 'assets'));
                const destinationAssetsPath = vscode.Uri.file(path.join(directoryPath, 'assets'));
  
                // Move the lib files
                vscode.workspace.fs.copy(sourcePath, destinationPath, { overwrite: true, recursive: true }).then(() => {
                    replace.sync({
                        files: [
                            `${directoryPath}/lib/**/*.dart`
                        ],
                        from: /getx_generator_brktrk/g,
                        to: projectName,
                        countMatches: true,
                    });

                    console.log("Lib files moved and placeholders replaced.");
                }).catch(err => {
                    console.error("Error during lib file copy:", err);
                });

                // Move assets files (ensure recursive flag)
                vscode.workspace.fs.copy(sourceAssetsPath, destinationAssetsPath, { overwrite: true, recursive: true }).then(() => {
                    console.log("Assets files moved.");
                }).catch(err => {
                    console.error("Error during assets file copy:", err);
                });
            }
        });
    } catch (error) {
        console.error("Error in moveFile:", error.message);
        vscode.window.showErrorMessage(`Error during file move: ${error.message}`);
    }
}


module.exports = {
    getxInstall
};
