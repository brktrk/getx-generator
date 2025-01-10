import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:getx_generator_brktrk/app/routes/app_pages.dart';

class SplashPage extends GetWidget {
  const SplashPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    Future.delayed(const Duration(seconds: 2), () {
      Get.offNamed(AppRoutes.home);
    });

    return Scaffold(
      body: Stack(
        children: [
          Center(
            child: FlutterLogo(
              size: Get.size.width * 0.4,
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              margin: EdgeInsets.only(
                bottom: Get.context!.mediaQueryPadding.bottom + 10,
              ),
              child: const CircularProgressIndicator(),
            ),
          )
        ],
      ),
    );
  }
}
