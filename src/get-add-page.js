// @ts-nocheck
const vscode = require('vscode');
const replace = require('replace-in-file');
const fs = require('fs');
const utils = require('./utils.js');
const path = require('path');

async function getxAddPage() {
    try {
        let pubspecPath = await utils.getPubspecPath();

        if (typeof pubspecPath === 'string' && pubspecPath.length > 0) {
            // Normalize ve dosya yolunu oluştur
            pubspecPath = path.normalize(pubspecPath).replace(/^\\/, '');
            const projectPath = pubspecPath.replace(/pubspec\.yaml$/, '');

            console.log("Normalized project path:", projectPath);

            // pubspec.yaml içeriğini oku
            const data = fs.readFileSync(pubspecPath, 'utf-8');
            const lines = data.split('\n');
            const projectName = lines[0].replace("name: ", "").trim();

            // Kullanıcıdan sayfa ismi al
            const pageName = await vscode.window.showInputBox({
                placeHolder: "Enter Page Name",
                prompt: "Add a page name with the following template: `PageName` or `page name` or `page_name`",
            });

            if (typeof pageName === 'string' && pageName.length > 0) {
                // Template dosyasını belirle (getx_brktrk dizinine göre)
                const parentDir = path.dirname(__dirname);
                const fixedParentDir = parentDir.replace(/\\/g, '/'); // Yolu standart hale getir
                const templatePath = path.join(fixedParentDir.replace('/src', ''), 'getx_brktrk', 'template', 'app', 'data', 'provider', 'template_provider.dart');
                const templateUri = vscode.Uri.file(templatePath);  // Correctly create the Uri

                console.log("Resolved template path:", templatePath);

                if (!fs.existsSync(templateUri.fsPath)) {
                    throw new Error(`Template file not found at: ${templateUri.fsPath}`);
                }
            
                // Dosyaları taşı
                await moveFile(projectPath, projectName, pageName);
                vscode.window.showInformationMessage('Generate successful :)');
            } else {
                vscode.window.showErrorMessage("Invalid page name.");
            }
            
        } else {
            vscode.window.showErrorMessage("Invalid pubspec path.");
        }
    } catch (error) {
        console.error("Error in getxAddPage:", error.message);
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

/**
 * @param {string} path
 * @param {string} projectName
 * @param {string} pageName
 */
async function moveFile(projectPath, projectName, pageName) {
    const parentDir = path.dirname(__dirname).replace(path.sep + 'src', '');
    const templateDir = vscode.Uri.file(path.join(parentDir, 'getx_brktrk', 'template', 'app')); // Use Uri.file for directories

    // Normalize and create the file and class names
    const fileName = pageName
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .replace(/page/g, '')
        .trim()
        .replace(/\s\s+/g, ' ')
        .replace(/\s/g, '_');

    const className = fileName
        .replace(/_/g, ' ')
        .replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
        .replace(/\s/g, '');

    const routeName = className.charAt(0).toLowerCase() + className.substring(1);
    const routeNameCmt = fileName
        .replace(/_/g, ' ')
        .replace(/\w+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

    // Define paths dynamically using `vscode.Uri.file()`
    const copyOperations = [
        {
            source: vscode.Uri.file(path.join(templateDir.fsPath, 'data', 'provider', 'template_provider.dart')),
            target: path.join(
                projectPath,
                'lib/app/data/provider',
                `${fileName}_provider.dart`
            ),
        },
        {
            source: vscode.Uri.file(path.join(templateDir.fsPath, 'modules', 'template_module', 'template_page.dart')),
            target: path.join(
                projectPath,
                'lib/app/modules',
                `${fileName}_module`,
                `${fileName}_page.dart`
            ),
        },
        {
            source: vscode.Uri.file(path.join(templateDir.fsPath, 'modules', 'template_module', 'template_controller.dart')),
            target: path.join(
                projectPath,
                'lib/app/modules',
                `${fileName}_module`,
                `${fileName}_controller.dart`
            ),
        },
        {
            source: vscode.Uri.file(path.join(templateDir.fsPath, 'modules', 'template_module', 'template_binding.dart')),
            target: path.join(
                projectPath,
                'lib/app/modules',
                `${fileName}_module`,
                `${fileName}_binding.dart`
            ),
        },
    ];

    // Check if target directories exist, if not create them, and copy files
    for (const { source, target } of copyOperations) {
        const targetDir = path.dirname(target);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        if (!fs.existsSync(source.fsPath)) {
            throw new Error(`Template file not found at: ${source.fsPath}`);
        }

        await vscode.workspace.fs.copy(
            source,
            vscode.Uri.file(target),
            { overwrite: true }
        );
    }

    // Update file content
    const filesToUpdate = [
        path.join(projectPath, 'lib/app/modules', `${fileName}_module`, '*.dart'),
        path.join(projectPath, 'lib/app/data/provider', `${fileName}_provider.dart`),
    ];

    replace.sync({
        files: filesToUpdate,
        from: [/getx_generator_brktrk/g, /Template/g, /template/g],
        to: [projectName, className, fileName],
    });

    // Modify app_pages.dart
    const appPagesPath = path.join(projectPath, 'lib/app/routes/app_pages.dart');
    if (fs.existsSync(appPagesPath)) {
        const appPagesData = fs.readFileSync(appPagesPath, 'utf-8').split('\n');
        const imports = [
            `import 'package:${projectName}/app/modules/${fileName}_module/${fileName}_page.dart';`,
            `import 'package:${projectName}/app/modules/${fileName}_module/${fileName}_binding.dart';`,
        ];

        appPagesData.splice(1, 0, ...imports);

        const index = appPagesData.findIndex((line) => line.includes(']'));
        if (index > -1) {
            appPagesData.splice(
                index,
                0,
                `    GetPage(
        name: AppRoutes.${routeName},
        page: () => const ${className}Page(),
        binding: ${className}Binding(),
    ),`
            );
        }

        fs.writeFileSync(appPagesPath, appPagesData.join('\n'), 'utf-8');
    }

    // Modify app_routes.dart
    const appRoutesPath = path.join(projectPath, 'lib/app/routes/app_routes.dart');
    if (fs.existsSync(appRoutesPath)) {
        const appRoutesData = fs.readFileSync(appRoutesPath, 'utf-8').split('\n');
        const index = appRoutesData.findIndex((line) => line.includes('}'));

        if (index > -1) {
            appRoutesData.splice(
                index,
                0,
                `  static const ${routeName} = '/${routeName}'; // ${routeNameCmt} page`
            );
        }

        fs.writeFileSync(appRoutesPath, appRoutesData.join('\n'), 'utf-8');
    }
}

module.exports = {
    getxAddPage
};
