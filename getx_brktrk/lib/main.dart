import 'package:flutter/material.dart';
import 'package:get/route_manager.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'package:getx_generator_brktrk/app/routes/app_pages.dart';
import 'package:getx_generator_brktrk/app/themes/app_theme.dart';
import 'package:getx_generator_brktrk/app/translations/app_translations.dart';
import 'package:getx_generator_brktrk/app/utils/extensions.dart';


void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    "Your device locale: ${Get.deviceLocale}".logStr(name: 'Locale');
    return GestureDetector(
      child: GetMaterialApp(
       builder: (context, child) => ResponsiveBreakpoints.builder(
        child: child!,
        breakpoints: [
          const Breakpoint(start: 0, end: 450, name: MOBILE),
          const Breakpoint(start: 451, end: 800, name: TABLET),
          const Breakpoint(start: 801, end: 1200, name: DESKTOP),
          const Breakpoint(start: 1201, end: double.infinity, name: '4K'),
        ],
      ),
        initialRoute: AppRoutes.initial,
        theme: AppThemes.themData,
        getPages: AppPages.pages,
        locale: AppTranslation.locale,
        translationsKeys: AppTranslation.translations,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}


