import 'package:get/get.dart';
import 'package:getx_generator_brktrk/app/data/provider/home_provider.dart';
import 'package:getx_generator_brktrk/app/modules/home_module/home_controller.dart';

class HomeBinding implements Bindings {
  @override
  void dependencies() {
    Get.lazyPut<HomeController>(
      () => HomeController(
        provider: HomeProvider(),
      ),
    );
  }
}
