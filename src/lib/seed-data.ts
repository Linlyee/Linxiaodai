// Seed data extracted for in-memory DB usage
// 24 restaurants, 80+ menu items

export const seedData = {
  restaurants: [
    { name: '蜀香阁', description: '正宗川菜，麻辣鲜香，二十年老店', imageUrl: '/images/restaurants/chinese.svg', rating: 4.8, ratingCount: 2356, categories: ['川菜', '中餐'], address: '朝阳区建国路88号', lat: 39.9050, lng: 116.4080, deliveryFee: 5, minOrderAmount: 25, avgDeliveryTime: 28, deliveryRange: 5, openingHours: '10:00-22:00', phone: '010-10000001' },
    { name: '樱花日本料理', description: '新鲜食材，匠心制作每一份料理', imageUrl: '/images/restaurants/japanese.svg', rating: 4.7, ratingCount: 1823, categories: ['日料', '海鲜'], address: '朝阳区光华路50号', lat: 39.9100, lng: 116.4150, deliveryFee: 8, minOrderAmount: 35, avgDeliveryTime: 35, deliveryRange: 5, openingHours: '11:00-21:30', phone: '010-10000002' },
    { name: '韩式炸鸡屋', description: '首尔风味，酥脆多汁，配啤酒更棒', imageUrl: '/images/restaurants/korean.svg', rating: 4.5, ratingCount: 1205, categories: ['韩料', '快餐'], address: '朝阳区望京街10号', lat: 39.9200, lng: 116.4300, deliveryFee: 4, minOrderAmount: 20, avgDeliveryTime: 25, deliveryRange: 4, openingHours: '10:30-23:00', phone: '010-10000003' },
    { name: '老北京炸酱面馆', description: '地道老北京味道，手工拉面', imageUrl: '/images/restaurants/noodle.svg', rating: 4.4, ratingCount: 3156, categories: ['面食', '中餐'], address: '东城区鼓楼大街15号', lat: 39.9400, lng: 116.4000, deliveryFee: 3, minOrderAmount: 15, avgDeliveryTime: 20, deliveryRange: 4, openingHours: '08:00-21:00', phone: '010-10000004' },
    { name: '粤味轩', description: '清淡鲜美，正宗广式风味', imageUrl: '/images/restaurants/cantonese.svg', rating: 4.6, ratingCount: 1678, categories: ['粤菜', '中餐'], address: '西城区金融街20号', lat: 39.9120, lng: 116.3580, deliveryFee: 6, minOrderAmount: 30, avgDeliveryTime: 32, deliveryRange: 5, openingHours: '10:00-22:00', phone: '010-10000005' },
    { name: '披萨工坊', description: '手工现做薄底披萨，意大利进口原料', imageUrl: '/images/restaurants/pizza.svg', rating: 4.3, ratingCount: 987, categories: ['西餐', '快餐'], address: '朝阳区三里屯路5号', lat: 39.9320, lng: 116.4550, deliveryFee: 7, minOrderAmount: 30, avgDeliveryTime: 30, deliveryRange: 5, openingHours: '10:00-22:30', phone: '010-10000006' },
    { name: '湘味人家', description: '地道湖南菜，香辣下饭', imageUrl: '/images/restaurants/hunan.svg', rating: 4.4, ratingCount: 1432, categories: ['湘菜', '中餐'], address: '海淀区中关村大街1号', lat: 39.9830, lng: 116.3100, deliveryFee: 4, minOrderAmount: 20, avgDeliveryTime: 25, deliveryRange: 4, openingHours: '10:30-21:30', phone: '010-10000007' },
    { name: '轻食主义', description: '新鲜低卡，健康美味两不误', imageUrl: '/images/restaurants/salad.svg', rating: 4.2, ratingCount: 756, categories: ['轻食', '沙拉'], address: '朝阳区国贸三期B1', lat: 39.9087, lng: 116.4600, deliveryFee: 5, minOrderAmount: 25, avgDeliveryTime: 22, deliveryRange: 5, openingHours: '09:00-20:00', phone: '010-10000008' },
    { name: '火麒麟烤串', description: '东北大串，炭火现烤，香飘四溢', imageUrl: '/images/restaurants/bbq.svg', rating: 4.6, ratingCount: 2890, categories: ['烧烤', '中餐'], address: '丰台区方庄路20号', lat: 39.8650, lng: 116.4200, deliveryFee: 3, minOrderAmount: 20, avgDeliveryTime: 30, deliveryRange: 4, openingHours: '16:00-02:00', phone: '010-10000009' },
    { name: '麻辣诱惑火锅', description: '正宗重庆牛油火锅，一人食也精彩', imageUrl: '/images/restaurants/hotpot.svg', rating: 4.7, ratingCount: 3201, categories: ['火锅', '川菜'], address: '朝阳区双井桥东100米', lat: 39.8980, lng: 116.4600, deliveryFee: 6, minOrderAmount: 40, avgDeliveryTime: 40, deliveryRange: 5, openingHours: '10:00-23:00', phone: '010-10000010' },
    { name: '小碗菜馆', description: '家常小碗菜，经济实惠，选择多样', imageUrl: '/images/restaurants/chinese2.svg', rating: 4.3, ratingCount: 4521, categories: ['中餐', '快餐'], address: '海淀区五道口10号', lat: 39.9920, lng: 116.3380, deliveryFee: 2, minOrderAmount: 12, avgDeliveryTime: 18, deliveryRange: 3, openingHours: '10:00-21:00', phone: '010-10000011' },
    { name: '海鲜大咖', description: '当日直达海鲜，清蒸原味最鲜美', imageUrl: '/images/restaurants/seafood.svg', rating: 4.5, ratingCount: 876, categories: ['海鲜'], address: '东城区王府井大街30号', lat: 39.9140, lng: 116.4100, deliveryFee: 10, minOrderAmount: 50, avgDeliveryTime: 35, deliveryRange: 5, openingHours: '11:00-21:00', phone: '010-10000012' },
    { name: '茶颜悦饮', description: '新中式茶饮，每一杯都是艺术品', imageUrl: '/images/restaurants/tea.svg', rating: 4.1, ratingCount: 5432, categories: ['饮品', '甜点'], address: '朝阳区大望路华贸B1', lat: 39.9100, lng: 116.4750, deliveryFee: 3, minOrderAmount: 15, avgDeliveryTime: 20, deliveryRange: 3, openingHours: '09:00-22:00', phone: '010-10000013' },
    { name: '泰国小厨', description: '酸辣鲜香，地道曼谷街头味道', imageUrl: '/images/restaurants/thai.svg', rating: 4.4, ratingCount: 1098, categories: ['东南亚', '海鲜'], address: '朝阳区亮马桥路15号', lat: 39.9500, lng: 116.4620, deliveryFee: 6, minOrderAmount: 30, avgDeliveryTime: 32, deliveryRange: 5, openingHours: '11:00-21:30', phone: '010-10000014' },
    { name: '西北面馆', description: '大西北手工拉面，劲道十足', imageUrl: '/images/restaurants/noodle2.svg', rating: 4.2, ratingCount: 2345, categories: ['面食', '中餐'], address: '丰台区马家堡东路5号', lat: 39.8550, lng: 116.3800, deliveryFee: 3, minOrderAmount: 15, avgDeliveryTime: 22, deliveryRange: 4, openingHours: '09:00-21:00', phone: '010-10000015' },
    { name: '甜品花园', description: '法式甜品与日式和果子的完美融合', imageUrl: '/images/restaurants/dessert.svg', rating: 4.5, ratingCount: 1567, categories: ['甜点', '饮品'], address: '西城区西单北大街100号', lat: 39.9130, lng: 116.3730, deliveryFee: 5, minOrderAmount: 20, avgDeliveryTime: 25, deliveryRange: 5, openingHours: '10:00-21:00', phone: '010-10000016' },
    { name: '咖喱屋', description: '印度主厨，20种香料秘制咖喱', imageUrl: '/images/restaurants/curry.svg', rating: 4.3, ratingCount: 654, categories: ['东南亚', '快餐'], address: '朝阳区新源里10号', lat: 39.9480, lng: 116.4500, deliveryFee: 5, minOrderAmount: 25, avgDeliveryTime: 28, deliveryRange: 4, openingHours: '10:30-21:30', phone: '010-10000017' },
    { name: '汉堡大师', description: '纯牛肉饼，现煎现做，大口满足', imageUrl: '/images/restaurants/burger.svg', rating: 4.0, ratingCount: 3210, categories: ['西餐', '快餐'], address: '海淀区西二旗大街5号', lat: 40.0530, lng: 116.3000, deliveryFee: 4, minOrderAmount: 20, avgDeliveryTime: 20, deliveryRange: 4, openingHours: '09:00-22:00', phone: '010-10000018' },
    { name: '素食天堂', description: '全素料理，让素食也能惊艳味蕾', imageUrl: '/images/restaurants/vegan.svg', rating: 4.1, ratingCount: 543, categories: ['轻食', '中餐'], address: '东城区雍和宫大街20号', lat: 39.9480, lng: 116.4170, deliveryFee: 4, minOrderAmount: 20, avgDeliveryTime: 25, deliveryRange: 4, openingHours: '10:00-20:30', phone: '010-10000019' },
    { name: '煲仔饭专营店', description: '广式煲仔饭，锅巴焦香，用料十足', imageUrl: '/images/restaurants/claypot.svg', rating: 4.4, ratingCount: 1678, categories: ['粤菜', '中餐', '快餐'], address: '朝阳区常营中路8号', lat: 39.9250, lng: 116.5900, deliveryFee: 4, minOrderAmount: 18, avgDeliveryTime: 25, deliveryRange: 4, openingHours: '10:00-21:00', phone: '010-10000020' },
    { name: '新疆大盘鸡', description: '正宗新疆风味，大盘鸡拌面一绝', imageUrl: '/images/restaurants/xinjiang.svg', rating: 4.3, ratingCount: 2100, categories: ['中餐', '面食'], address: '海淀区学院路15号', lat: 39.9850, lng: 116.3500, deliveryFee: 4, minOrderAmount: 20, avgDeliveryTime: 28, deliveryRange: 5, openingHours: '10:00-22:00', phone: '010-10000021' },
    { name: '煎饼果子铺', description: '天津老味煎饼果子，绿豆面现摊', imageUrl: '/images/restaurants/snack.svg', rating: 4.0, ratingCount: 4567, categories: ['小吃', '快餐'], address: '西城区新街口南大街8号', lat: 39.9380, lng: 116.3730, deliveryFee: 2, minOrderAmount: 8, avgDeliveryTime: 15, deliveryRange: 3, openingHours: '06:00-20:00', phone: '010-10000022' },
    { name: '云南过桥米线', description: '正宗云南过桥米线，汤鲜料足', imageUrl: '/images/restaurants/yunnan.svg', rating: 4.2, ratingCount: 1345, categories: ['中餐', '面食'], address: '朝阳区青年路大悦城B1', lat: 39.9230, lng: 116.5100, deliveryFee: 4, minOrderAmount: 18, avgDeliveryTime: 22, deliveryRange: 4, openingHours: '09:30-21:30', phone: '010-10000023' },
  ],

  menuItems: [
    // 蜀香阁
    { restaurantName: '蜀香阁', name: '麻辣水煮鱼', price: 48, originalPrice: 58, category: '主菜', spiceLevel: 'hot', ingredients: ['鱼片', '豆芽', '花椒', '干辣椒'], allergens: [], tags: ['招牌', '辣'], description: '鲜嫩鱼片配麻辣汤底', calories: 380, salesCount: 1520, rating: 4.8 },
    { restaurantName: '蜀香阁', name: '宫保鸡丁', price: 32, originalPrice: 38, category: '主菜', spiceLevel: 'medium', ingredients: ['鸡丁', '花生', '干辣椒'], allergens: ['花生'], tags: ['经典', '下饭'], description: '经典川菜', calories: 420, salesCount: 2100, rating: 4.7 },
    { restaurantName: '蜀香阁', name: '麻婆豆腐', price: 22, category: '主菜', spiceLevel: 'hot', ingredients: ['豆腐', '牛肉末', '豆瓣酱', '花椒'], allergens: [], tags: ['经典', '下饭'], description: '麻辣鲜香嫩', calories: 280, salesCount: 1800, rating: 4.6 },
    { restaurantName: '蜀香阁', name: '回锅肉', price: 35, category: '主菜', spiceLevel: 'medium', ingredients: ['五花肉', '蒜苗', '豆瓣酱'], allergens: [], tags: ['经典'], description: '肥而不腻', calories: 520, salesCount: 1650, rating: 4.5 },
    { restaurantName: '蜀香阁', name: '蛋炒饭', price: 15, category: '主食', spiceLevel: 'none', ingredients: ['米饭', '鸡蛋', '葱'], allergens: ['蛋'], tags: ['主食'], description: '粒粒分明', calories: 350, salesCount: 980, rating: 4.2 },
    { restaurantName: '蜀香阁', name: '鱼香肉丝', price: 28, category: '主菜', spiceLevel: 'mild', ingredients: ['猪肉丝', '木耳', '胡萝卜'], allergens: [], tags: ['经典'], description: '酸甜微辣', calories: 380, salesCount: 1350, rating: 4.4 },
    { restaurantName: '蜀香阁', name: '夫妻肺片', price: 25, category: '凉菜', spiceLevel: 'hot', ingredients: ['牛腱', '牛肚', '花生', '红油'], allergens: ['花生'], tags: ['经典凉菜'], description: '麻辣鲜香', calories: 220, salesCount: 1100, rating: 4.5 },
    // 樱花日本料理
    { restaurantName: '樱花日本料理', name: '三文鱼刺身', price: 68, originalPrice: 78, category: '刺身', spiceLevel: 'none', ingredients: ['三文鱼', '芥末', '酱油'], allergens: ['鱼'], tags: ['招牌', '新鲜'], description: '新鲜三文鱼', calories: 220, salesCount: 1200, rating: 4.8 },
    { restaurantName: '樱花日本料理', name: '鳗鱼饭', price: 58, category: '主食', spiceLevel: 'none', ingredients: ['鳗鱼', '米饭', '照烧酱'], allergens: ['鱼'], tags: ['招牌', '人气'], description: '蒲烧鳗鱼', calories: 550, salesCount: 890, rating: 4.7 },
    { restaurantName: '樱花日本料理', name: '天妇罗拼盘', price: 45, category: '炸物', spiceLevel: 'none', ingredients: ['虾', '南瓜', '茄子', '红薯'], allergens: ['虾'], tags: ['酥脆'], description: '外酥里嫩', calories: 380, salesCount: 760, rating: 4.4 },
    { restaurantName: '樱花日本料理', name: '日式拉面', price: 35, category: '主食', spiceLevel: 'mild', ingredients: ['拉面', '叉烧', '溏心蛋', '海苔'], allergens: ['蛋'], tags: ['暖胃'], description: '浓厚豚骨汤底', calories: 580, salesCount: 1100, rating: 4.5 },
    // 韩式炸鸡屋
    { restaurantName: '韩式炸鸡屋', name: '原味炸鸡半只', price: 38, category: '炸鸡', spiceLevel: 'none', ingredients: ['鸡肉', '面粉', '蒜粉'], allergens: [], tags: ['招牌', '酥脆'], description: '多汁鲜美', calories: 650, salesCount: 2300, rating: 4.6 },
    { restaurantName: '韩式炸鸡屋', name: '甜辣酱炸鸡', price: 42, category: '炸鸡', spiceLevel: 'medium', ingredients: ['鸡肉', '韩式辣酱', '蜂蜜'], allergens: [], tags: ['人气', '甜辣'], description: '甜辣交织', calories: 680, salesCount: 2100, rating: 4.7 },
    { restaurantName: '韩式炸鸡屋', name: '韩式拌饭', price: 28, category: '主食', spiceLevel: 'mild', ingredients: ['米饭', '牛肉', '菠菜', '豆芽', '鸡蛋'], allergens: ['蛋'], tags: ['营养'], description: '五彩蔬菜', calories: 480, salesCount: 670, rating: 4.3 },
    { restaurantName: '韩式炸鸡屋', name: '韩式部队锅', price: 48, category: '锅物', spiceLevel: 'medium', ingredients: ['泡面', '午餐肉', '年糕', '芝士', '泡菜'], allergens: ['奶'], tags: ['人气', '暖冬'], description: '一锅满足', calories: 750, salesCount: 890, rating: 4.4 },
    // 老北京炸酱面馆
    { restaurantName: '老北京炸酱面馆', name: '老北京炸酱面', price: 18, category: '主食', spiceLevel: 'none', ingredients: ['面条', '猪肉末', '黄酱', '黄瓜'], allergens: [], tags: ['招牌', '地道'], description: '地道京味', calories: 450, salesCount: 3200, rating: 4.5 },
    { restaurantName: '老北京炸酱面馆', name: '打卤面', price: 16, category: '主食', spiceLevel: 'none', ingredients: ['面条', '木耳', '黄花菜', '鸡蛋'], allergens: ['蛋'], tags: ['家常'], description: '鲜香卤汁', calories: 420, salesCount: 1800, rating: 4.3 },
    { restaurantName: '老北京炸酱面馆', name: '西红柿鸡蛋面', price: 14, category: '主食', spiceLevel: 'none', ingredients: ['面条', '西红柿', '鸡蛋'], allergens: ['蛋'], tags: ['家常'], description: '酸甜开胃', calories: 380, salesCount: 2400, rating: 4.2 },
    // 粤味轩
    { restaurantName: '粤味轩', name: '白切鸡', price: 38, category: '主菜', spiceLevel: 'none', ingredients: ['三黄鸡', '姜', '葱'], allergens: [], tags: ['招牌', '清淡'], description: '皮爽肉滑', calories: 320, salesCount: 1450, rating: 4.6 },
    { restaurantName: '粤味轩', name: '干炒牛河', price: 28, category: '主食', spiceLevel: 'none', ingredients: ['河粉', '牛肉', '豆芽'], allergens: [], tags: ['经典', '镬气'], description: '镬气十足', calories: 520, salesCount: 980, rating: 4.4 },
    { restaurantName: '粤味轩', name: '虾饺皇', price: 32, category: '点心', spiceLevel: 'none', ingredients: ['虾仁', '澄面', '笋丁'], allergens: ['虾'], tags: ['招牌', '精致'], description: '皮薄馅大', calories: 180, salesCount: 1200, rating: 4.7 },
    { restaurantName: '粤味轩', name: '蜜汁叉烧', price: 35, category: '主菜', spiceLevel: 'none', ingredients: ['猪肉', '蜂蜜', '叉烧酱'], allergens: [], tags: ['人气', '甜香'], description: '焦香甜蜜', calories: 480, salesCount: 1100, rating: 4.5 },
    { restaurantName: '粤味轩', name: '豉汁排骨', price: 32, category: '主菜', spiceLevel: 'none', ingredients: ['排骨', '豆豉', '蒜'], allergens: [], tags: ['经典'], description: '豉香浓郁', calories: 420, salesCount: 980, rating: 4.3 },
    { restaurantName: '粤味轩', name: '肠粉', price: 18, category: '点心', spiceLevel: 'none', ingredients: ['米粉', '猪肉末', '鸡蛋'], allergens: ['蛋'], tags: ['早餐'], description: '滑嫩细腻', calories: 220, salesCount: 1450, rating: 4.2 },
    // 披萨工坊
    { restaurantName: '披萨工坊', name: '玛格丽特披萨 9寸', price: 42, category: '披萨', spiceLevel: 'none', ingredients: ['面粉', '番茄酱', '马苏里拉芝士', '罗勒'], allergens: ['奶'], tags: ['经典'], description: '经典意式', calories: 680, salesCount: 670, rating: 4.3 },
    { restaurantName: '披萨工坊', name: '意式肉酱面', price: 32, category: '主食', spiceLevel: 'mild', ingredients: ['意面', '牛肉末', '番茄', '洋葱'], allergens: ['奶'], tags: ['经典'], description: '慢炖肉酱', calories: 550, salesCount: 540, rating: 4.2 },
    { restaurantName: '披萨工坊', name: '超级至尊披萨', price: 55, category: '披萨', spiceLevel: 'mild', ingredients: ['面粉', '芝士', '火腿', '蘑菇', '青椒', '牛肉粒'], allergens: ['奶'], tags: ['人气'], description: '料多满足', calories: 780, salesCount: 780, rating: 4.4 },
    // 湘味人家
    { restaurantName: '湘味人家', name: '剁椒鱼头', price: 58, originalPrice: 68, category: '主菜', spiceLevel: 'hot', ingredients: ['鱼头', '剁椒', '蒜', '姜'], allergens: ['鱼'], tags: ['招牌', '辣'], description: '鲜辣入味', calories: 350, salesCount: 1230, rating: 4.7 },
    { restaurantName: '湘味人家', name: '小炒肉', price: 28, category: '主菜', spiceLevel: 'hot', ingredients: ['猪肉', '青椒', '蒜', '豆豉'], allergens: [], tags: ['经典', '下饭'], description: '香辣下饭', calories: 450, salesCount: 2100, rating: 4.5 },
    { restaurantName: '湘味人家', name: '蒜蓉空心菜', price: 18, category: '素菜', spiceLevel: 'mild', ingredients: ['空心菜', '蒜'], allergens: [], tags: ['清爽'], description: '清脆爽口', calories: 80, salesCount: 890, rating: 4.1 },
    { restaurantName: '湘味人家', name: '毛氏红烧肉', price: 38, category: '主菜', spiceLevel: 'mild', ingredients: ['五花肉', '酱油', '冰糖', '八角'], allergens: [], tags: ['招牌'], description: '入口即化', calories: 520, salesCount: 1400, rating: 4.6 },
    { restaurantName: '湘味人家', name: '农家小炒腊肉', price: 32, category: '主菜', spiceLevel: 'hot', ingredients: ['腊肉', '蒜苗', '干辣椒'], allergens: [], tags: ['地道'], description: '烟熏腊肉', calories: 450, salesCount: 1100, rating: 4.4 },
    // 轻食主义
    { restaurantName: '轻食主义', name: '凯撒沙拉', price: 32, category: '沙拉', spiceLevel: 'none', ingredients: ['罗马生菜', '鸡胸肉', '面包丁', '凯撒酱'], allergens: ['奶'], tags: ['低卡', '高蛋白'], description: '健康美味', calories: 280, salesCount: 780, rating: 4.3 },
    { restaurantName: '轻食主义', name: '牛油果鸡胸三明治', price: 28, category: '三明治', spiceLevel: 'none', ingredients: ['全麦面包', '牛油果', '鸡胸肉', '番茄'], allergens: [], tags: ['低卡', '饱腹'], description: '超级食物', calories: 350, salesCount: 650, rating: 4.2 },
    { restaurantName: '轻食主义', name: '巴西莓碗', price: 38, category: '轻食碗', spiceLevel: 'none', ingredients: ['巴西莓', '香蕉', '燕麦', '椰子片'], allergens: [], tags: ['网红', '抗氧化'], description: '颜值爆表', calories: 320, salesCount: 430, rating: 4.1 },
    { restaurantName: '轻食主义', name: '藜麦鸡肉碗', price: 35, category: '轻食碗', spiceLevel: 'none', ingredients: ['藜麦', '鸡胸肉', '西兰花', '玉米'], allergens: [], tags: ['高蛋白', '低GI'], description: '超级谷物', calories: 350, salesCount: 520, rating: 4.1 },
    // 火麒麟烤串
    { restaurantName: '火麒麟烤串', name: '羊肉串（10串）', price: 35, category: '烤串', spiceLevel: 'medium', ingredients: ['羊肉', '孜然', '辣椒粉'], allergens: [], tags: ['招牌', '必点'], description: '孜然飘香', calories: 420, salesCount: 3500, rating: 4.7 },
    { restaurantName: '火麒麟烤串', name: '烤鸡翅（5串）', price: 25, category: '烤串', spiceLevel: 'mild', ingredients: ['鸡翅', '蜂蜜', '酱油'], allergens: [], tags: ['人气'], description: '蜜汁烤制', calories: 380, salesCount: 2800, rating: 4.5 },
    { restaurantName: '火麒麟烤串', name: '烤韭菜', price: 12, category: '烤串', spiceLevel: 'medium', ingredients: ['韭菜', '蒜', '辣椒粉'], allergens: [], tags: ['素菜'], description: '韭香浓郁', calories: 60, salesCount: 1500, rating: 4.0 },
    { restaurantName: '火麒麟烤串', name: '烤茄子', price: 15, category: '烤串', spiceLevel: 'medium', ingredients: ['茄子', '蒜', '辣椒粉', '孜然'], allergens: [], tags: ['素菜'], description: '蒜香浓郁', calories: 120, salesCount: 1800, rating: 4.2 },
    // 麻辣诱惑火锅
    { restaurantName: '麻辣诱惑火锅', name: '一人食火锅套餐', price: 58, category: '套餐', spiceLevel: 'hot', ingredients: ['牛肉卷', '毛肚', '豆腐', '藕片', '土豆', '金针菇'], allergens: [], tags: ['招牌', '一人食'], description: '一个人也要吃火锅', calories: 750, salesCount: 1800, rating: 4.6 },
    { restaurantName: '麻辣诱惑火锅', name: '鸳鸯锅底', price: 38, category: '锅底', spiceLevel: 'hot', ingredients: ['牛油', '花椒', '干辣椒'], allergens: [], tags: [], description: '麻辣+番茄', calories: 300, salesCount: 2100, rating: 4.5 },
    { restaurantName: '麻辣诱惑火锅', name: '毛肚', price: 32, category: '涮品', spiceLevel: 'hot', ingredients: ['牛百叶'], allergens: [], tags: ['必点'], description: '七上八下', calories: 150, salesCount: 2300, rating: 4.6 },
    { restaurantName: '麻辣诱惑火锅', name: '虾滑', price: 28, category: '涮品', spiceLevel: 'mild', ingredients: ['虾肉', '蛋清'], allergens: ['虾', '蛋'], tags: ['人气'], description: '纯虾肉手打', calories: 180, salesCount: 1650, rating: 4.5 },
    // 小碗菜馆
    { restaurantName: '小碗菜馆', name: '红烧肉小碗', price: 16, category: '主菜', spiceLevel: 'none', ingredients: ['五花肉', '酱油', '冰糖'], allergens: [], tags: ['人气', '下饭'], description: '软糯入味', calories: 400, salesCount: 3200, rating: 4.4 },
    { restaurantName: '小碗菜馆', name: '番茄炒蛋小碗', price: 10, category: '主菜', spiceLevel: 'none', ingredients: ['番茄', '鸡蛋'], allergens: ['蛋'], tags: ['家常'], description: '国民下饭菜', calories: 180, salesCount: 4500, rating: 4.3 },
    { restaurantName: '小碗菜馆', name: '酸辣土豆丝', price: 8, category: '素菜', spiceLevel: 'mild', ingredients: ['土豆', '干辣椒', '醋'], allergens: [], tags: ['人气'], description: '酸辣脆爽', calories: 150, salesCount: 3800, rating: 4.2 },
    { restaurantName: '小碗菜馆', name: '蒜蓉西兰花', price: 12, category: '素菜', spiceLevel: 'none', ingredients: ['西兰花', '蒜'], allergens: [], tags: ['健康'], description: '清脆健康', calories: 80, salesCount: 2100, rating: 4.1 },
    // 海鲜大咖
    { restaurantName: '海鲜大咖', name: '清蒸鲈鱼', price: 68, category: '主菜', spiceLevel: 'none', ingredients: ['鲈鱼', '姜', '葱', '蒸鱼豉油'], allergens: ['鱼'], tags: ['招牌', '清淡'], description: '鲜嫩清甜', calories: 280, salesCount: 890, rating: 4.6 },
    { restaurantName: '海鲜大咖', name: '白灼虾', price: 58, category: '主菜', spiceLevel: 'none', ingredients: ['基围虾', '姜'], allergens: ['虾'], tags: ['人气', '新鲜'], description: '虾肉弹牙', calories: 200, salesCount: 760, rating: 4.5 },
    { restaurantName: '海鲜大咖', name: '椒盐皮皮虾', price: 48, category: '主菜', spiceLevel: 'medium', ingredients: ['皮皮虾', '椒盐', '蒜', '辣椒'], allergens: ['虾'], tags: ['人气'], description: '酥脆鲜香', calories: 350, salesCount: 650, rating: 4.3 },
    // 茶颜悦饮
    { restaurantName: '茶颜悦饮', name: '幽兰拿铁', price: 22, category: '奶茶', spiceLevel: 'none', ingredients: ['红茶', '牛奶', '奶油', '碧根果'], allergens: ['奶'], tags: ['招牌', '网红'], description: '奶油顶', calories: 350, salesCount: 5600, rating: 4.5 },
    { restaurantName: '茶颜悦饮', name: '桂花乌龙', price: 18, category: '纯茶', spiceLevel: 'none', ingredients: ['乌龙茶', '桂花'], allergens: [], tags: ['花香'], description: '桂花飘香', calories: 50, salesCount: 3200, rating: 4.3 },
    { restaurantName: '茶颜悦饮', name: '黑糖珍珠鲜奶', price: 25, category: '奶茶', spiceLevel: 'none', ingredients: ['鲜奶', '黑糖', '珍珠'], allergens: ['奶'], tags: ['人气'], description: 'Q弹珍珠', calories: 420, salesCount: 4800, rating: 4.4 },
    { restaurantName: '茶颜悦饮', name: '芒果冰沙', price: 20, category: '冰沙', spiceLevel: 'none', ingredients: ['芒果', '冰块', '炼乳'], allergens: ['奶'], tags: ['夏日'], description: '冰爽解暑', calories: 280, salesCount: 2300, rating: 4.2 },
    // 泰国小厨
    { restaurantName: '泰国小厨', name: '冬阴功汤', price: 38, category: '汤品', spiceLevel: 'hot', ingredients: ['虾', '蘑菇', '香茅', '柠檬叶', '椰奶'], allergens: ['虾'], tags: ['招牌', '酸辣'], description: '酸辣开胃', calories: 220, salesCount: 980, rating: 4.6 },
    { restaurantName: '泰国小厨', name: '泰式绿咖喱鸡', price: 35, category: '主菜', spiceLevel: 'medium', ingredients: ['鸡肉', '绿咖喱', '椰奶', '茄子'], allergens: [], tags: ['人气'], description: '椰香浓郁', calories: 450, salesCount: 760, rating: 4.4 },
    { restaurantName: '泰国小厨', name: '芒果糯米饭', price: 25, category: '甜品', spiceLevel: 'none', ingredients: ['糯米', '芒果', '椰浆'], allergens: [], tags: ['甜品', '人气'], description: '甜蜜软糯', calories: 380, salesCount: 650, rating: 4.4 },
    // 西北面馆
    { restaurantName: '西北面馆', name: '牛肉拉面', price: 22, category: '主食', spiceLevel: 'mild', ingredients: ['拉面', '牛肉', '白萝卜', '香菜', '辣椒油'], allergens: [], tags: ['招牌', '汤面'], description: '一清二白', calories: 480, salesCount: 2800, rating: 4.4 },
    { restaurantName: '西北面馆', name: '油泼面', price: 18, category: '主食', spiceLevel: 'medium', ingredients: ['宽面', '辣椒面', '蒜', '葱'], allergens: [], tags: ['人气', '拌面'], description: '香气四溢', calories: 450, salesCount: 2100, rating: 4.3 },
    // 甜品花园
    { restaurantName: '甜品花园', name: '提拉米苏', price: 35, category: '蛋糕', spiceLevel: 'none', ingredients: ['马斯卡彭芝士', '咖啡', '可可粉'], allergens: ['奶'], tags: ['经典', '意式'], description: '入口即化', calories: 380, salesCount: 1200, rating: 4.5 },
    { restaurantName: '甜品花园', name: '抹茶千层', price: 38, category: '蛋糕', spiceLevel: 'none', ingredients: ['抹茶粉', '奶油', '薄饼'], allergens: ['奶'], tags: ['人气', '日式'], description: '抹茶清香', calories: 350, salesCount: 980, rating: 4.4 },
    { restaurantName: '甜品花园', name: '杨枝甘露', price: 28, category: '甜品', spiceLevel: 'none', ingredients: ['芒果', '西柚', '西米', '椰奶'], allergens: [], tags: ['港式', '经典'], description: '酸甜清爽', calories: 280, salesCount: 1100, rating: 4.3 },
    // 咖喱屋
    { restaurantName: '咖喱屋', name: '鸡肉咖喱饭', price: 28, category: '主食', spiceLevel: 'medium', ingredients: ['鸡肉', '咖喱', '洋葱', '胡萝卜', '土豆'], allergens: [], tags: ['招牌', '饱腹'], description: '香料慢炖', calories: 550, salesCount: 890, rating: 4.3 },
    { restaurantName: '咖喱屋', name: '印度烤饼', price: 12, category: '主食', spiceLevel: 'none', ingredients: ['面粉', '酸奶', '黄油'], allergens: ['奶'], tags: [], description: '炭火烤制', calories: 280, salesCount: 760, rating: 4.2 },
    // 汉堡大师
    { restaurantName: '汉堡大师', name: '经典牛肉堡', price: 32, category: '汉堡', spiceLevel: 'none', ingredients: ['牛肉饼', '芝士', '生菜', '番茄'], allergens: ['奶'], tags: ['招牌', '经典'], description: '现煎牛肉饼', calories: 650, salesCount: 3200, rating: 4.3 },
    { restaurantName: '汉堡大师', name: '薯条（大）', price: 15, category: '小食', spiceLevel: 'none', ingredients: ['土豆', '盐'], allergens: [], tags: ['必点'], description: '粗薯现炸', calories: 380, salesCount: 4100, rating: 4.0 },
    { restaurantName: '汉堡大师', name: '双层芝士牛肉堡', price: 48, category: '汉堡', spiceLevel: 'none', ingredients: ['牛肉饼x2', '芝士x2', '培根'], allergens: ['奶'], tags: ['巨无霸'], description: '极致满足', calories: 950, salesCount: 2100, rating: 4.2 },
    // 素食天堂
    { restaurantName: '素食天堂', name: '素宫保鸡丁', price: 25, category: '主菜', spiceLevel: 'medium', ingredients: ['素鸡丁', '花生', '干辣椒'], allergens: ['花生'], tags: ['素食', '下饭'], description: '植物肉版', calories: 250, salesCount: 540, rating: 4.1 },
    { restaurantName: '素食天堂', name: '素麻辣香锅', price: 38, category: '主菜', spiceLevel: 'hot', ingredients: ['素肉', '藕片', '土豆', '木耳', '豆皮'], allergens: [], tags: ['素食', '辣'], description: '全素麻辣香锅', calories: 350, salesCount: 430, rating: 4.2 },
    { restaurantName: '素食天堂', name: '素炸酱面', price: 16, category: '主食', spiceLevel: 'mild', ingredients: ['面条', '素肉末', '黄酱', '黄瓜'], allergens: [], tags: ['素食', '家常'], description: '素版炸酱面', calories: 380, salesCount: 450, rating: 4.0 },
    // 煲仔饭专营店
    { restaurantName: '煲仔饭专营店', name: '腊味煲仔饭', price: 28, category: '煲仔饭', spiceLevel: 'none', ingredients: ['米饭', '腊肠', '腊肉', '青菜'], allergens: [], tags: ['招牌', '经典'], description: '腊味飘香', calories: 550, salesCount: 1500, rating: 4.5 },
    { restaurantName: '煲仔饭专营店', name: '滑鸡煲仔饭', price: 26, category: '煲仔饭', spiceLevel: 'none', ingredients: ['米饭', '鸡腿肉', '香菇', '姜'], allergens: [], tags: ['人气'], description: '鸡肉嫩滑', calories: 520, salesCount: 1200, rating: 4.4 },
    { restaurantName: '煲仔饭专营店', name: '排骨煲仔饭', price: 30, category: '煲仔饭', spiceLevel: 'none', ingredients: ['米饭', '排骨', '豆豉'], allergens: [], tags: ['经典'], description: '豉汁排骨', calories: 580, salesCount: 980, rating: 4.3 },
    // 新疆大盘鸡
    { restaurantName: '新疆大盘鸡', name: '大盘鸡拌面', price: 38, category: '主食', spiceLevel: 'medium', ingredients: ['鸡肉', '土豆', '宽面', '青椒', '孜然'], allergens: [], tags: ['招牌', '实惠'], description: '鸡肉鲜嫩', calories: 680, salesCount: 1800, rating: 4.4 },
    { restaurantName: '新疆大盘鸡', name: '羊肉抓饭', price: 32, category: '主食', spiceLevel: 'mild', ingredients: ['米饭', '羊肉', '胡萝卜', '洋葱'], allergens: [], tags: ['人气'], description: '羊肉飘香', calories: 600, salesCount: 1200, rating: 4.3 },
    { restaurantName: '新疆大盘鸡', name: '烤包子（3个）', price: 18, category: '小吃', spiceLevel: 'mild', ingredients: ['面粉', '羊肉', '洋葱', '孜然'], allergens: [], tags: ['特色'], description: '酥皮羊肉', calories: 380, salesCount: 870, rating: 4.3 },
    // 煎饼果子铺
    { restaurantName: '煎饼果子铺', name: '传统煎饼果子', price: 10, category: '小吃', spiceLevel: 'mild', ingredients: ['绿豆面', '鸡蛋', '薄脆', '葱', '面酱'], allergens: ['蛋'], tags: ['招牌', '天津味'], description: '绿豆面现摊', calories: 380, salesCount: 4500, rating: 4.3 },
    { restaurantName: '煎饼果子铺', name: '豆腐脑', price: 8, category: '小吃', spiceLevel: 'none', ingredients: ['豆腐', '木耳', '黄花菜', '卤汁'], allergens: [], tags: ['人气'], description: '嫩滑咸香', calories: 120, salesCount: 3200, rating: 4.1 },
    // 云南过桥米线
    { restaurantName: '云南过桥米线', name: '经典过桥米线', price: 28, category: '主食', spiceLevel: 'mild', ingredients: ['米线', '鸡肉', '火腿', '鹌鹑蛋', '韭菜', '高汤'], allergens: ['蛋'], tags: ['招牌', '云南味'], description: '滚烫高汤', calories: 480, salesCount: 1600, rating: 4.3 },
    { restaurantName: '云南过桥米线', name: '酸汤米线', price: 22, category: '主食', spiceLevel: 'medium', ingredients: ['米线', '酸菜', '猪肉末', '番茄'], allergens: [], tags: ['开胃'], description: '酸爽开胃', calories: 420, salesCount: 1100, rating: 4.2 },
    { restaurantName: '云南过桥米线', name: '汽锅鸡', price: 38, category: '汤品', spiceLevel: 'none', ingredients: ['鸡肉', '枸杞', '姜', '高汤'], allergens: [], tags: ['滋补', '云南味'], description: '蒸汽凝结', calories: 250, salesCount: 670, rating: 4.2 },
  ],
};
