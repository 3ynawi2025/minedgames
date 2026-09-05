# Brain Games — دليل النشر (iOS + Android)

منصة ألعاب متعددة: Number Match + Sudoku، مبنية بـ HTML/CSS/JS ومغلّفة بـ Capacitor 8.

## الهيكل
- www/ = تطبيق الويب (الكود الفعلي: index.html + styles + js)
- ios/ = مشروع Xcode (نظام Swift Package Manager — لا يحتاج CocoaPods)
- android/ = مشروع Android (يحتاج JDK + Android Studio للبناء)

## المتطلبات
- iOS: Xcode (مثبّت لديك، الإصدار 26.3) + حساب Apple Developer Program
- Android: Android Studio + JDK 17 أو أحدث (غير مثبّت حاليًا — ثبّته أولًا)

## خطوات النشر على iOS (App Store)
1. حدّث معرف الحزمة (bundle id) في capacitor.config.json (حقل appId) ليطابق المعرف المسجّل في حسابك (التطبيق الموجود 6804312275).
2. نفّذ:  npm run build && npx cap sync ios
3. افتح المشروع:  npx cap open ios   (أو ios/App/App.xcworkspace)
4. في Xcode: اختر فريق التوقيع (Signing & Capabilities > Team)، ثم شغّل على جهاز/محاكي.
5. للرفع: Product > Archive، ثم من Organizer اختر Distribute App إلى App Store Connect.
6. أكمل بيانات المتجر في App Store Connect (الاسم، لقطات الشاشة، الوصف، بطاقات الخصوصية) وأرسل للمراجعة.

## خطوات النشر على Android (Google Play)
1. ثبّت JDK 17+ و Android Studio.
2. نفّذ:  npm run build && npx cap sync android
3. افتح:  npx cap open android
4. من Android Studio: Build > Generate Signed Bundle / APK > اختر AAB.
5. ارفع ملف AAB إلى Google Play Console (حساب 25$ مرة واحدة).

## الأيقونة وشاشة البداية
- iOS: استبدل صور ios/App/App/Assets.xcassets/AppIcon.appiconset بأيقونتك (1024×1024).
- Android: استبدل صور android/app/src/main/res/mipmap-*/ic_launcher*.png.
- أنشئ لقطات الشاشة من التطبيق بعد تشغيله.

## ربط الإعلانات (AdMob) — مكتمل
- المكوّنان @capacitor-community/admob + @capacitor/haptics مثبّتان ومربوطان.
- معرّفات iOS الحقيقية: App ID + Banner + Rewarded (في ios/App/App/Info.plist و js/services/ads.js).
- الإعلان البيني (Interstitial) يظهر بين الجولات — ضع معرّفه في ads.js عند إنشاء الوحدة.
- نظام Android يحتاج تسجيل تطبيق منفصل في AdMob (منصة Android) ثم وضع معرّفاته في AndroidManifest.xml.
- السياسة: إعلان مكافأة/بيني فقط عند الفواصل، بلا قواطع وسط اللعب.

## إضافات مستقبلية موصى بها
- الحفظ السحابي (Cloud Save) — تميّز تنافسي (المنافس يفتقده).
- التحدي اليومي بواجهة + العملات + وضع عمى الألوان.
- ألعاب إضافية: كاكورو / بحث كلمات (أضف وحدة وسجّلها في registry.js).

## إضافة لعبة جديدة (قابلية التوسّع)
1. أنشئ ملف js/games/my-game.js ينفّذ نفس شكل الوحدات (id, name, nameAr, desc, gradient, icon, mount).
2. استوردها في js/main.js وادعُ registerGame(myGameModule).
3. نفّذ npm run build && npx cap sync لإعادة تضمينها.