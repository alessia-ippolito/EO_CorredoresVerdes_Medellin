// =============================================================================
// Google Earth Engine – Data Preparation & Export
// Project: Medellín Green Corridors – Land Cover & LST Change Detection
// =============================================================================
// Description:
//   This script prepares multi-temporal Sentinel-2 and Landsat-8 composites
//   for the Medellín and Bogotá study areas and exports them to Google Drive
//   for further analysis in Python (see scripts/land_cover_classification.py).
//
// Full interactive version:
//   https://code.earthengine.google.com/93dde6c12e1f312708cf7c53a53ea9a1
//
// Exports produced:
//   - Sentinel-2 multi-band composites (bands + indices + terrain + GLCM texture)
//       S2_Medellin_Texture_before.tif   (pre-corridors period)
//       S2_Medellin_Texture_20.tif       (2020 mid-point)
//       S2_Medellin_Texture_after.tif    (post-corridors period)
//   - Sentinel-2 composite for Bogotá (generalization test)
//       S2_Bogota_Texture.tif
//   - Landsat-8 Band 10 surface temperature mosaics
//       thermal_Before.tif
//       thermal_After.tif
//   - Training/test point CSV files sampled at reference polygons
//       Medellin_Training_Optimal.csv
//       Bogota_Test_Optimal.csv
//
// Usage:
//   1. Open the link above in the GEE Code Editor.
//   2. Set your Google Drive folder in the Export.image.toDrive() calls.
//   3. Click "Run", then submit the tasks in the Tasks panel.
// =============================================================================



// =============================================================================
// IMPORTED ASSETS – Ground Control Points
// =============================================================================
// In GEE Code Editor these appear in the "Imports" panel at the top.
// They are included here as inline FeatureCollections so the script is
// fully self-contained and can be run by anyone without re-digitising.
//
// Class encoding:  0 = Non-Vegetation (urban / built-up)
//                  1 = Vegetation
// =============================================================================

var urban = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-75.57188695897987, 6.261528038484422]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57072824468544, 6.259096451067708]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59463209142616, 6.262210587303216]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58965391149452, 6.257262088158074]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59991067876747, 6.258328579005523]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57645744314125, 6.27677852574425]),  {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57834571828774, 6.277226435409439]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56078261365822, 6.274538971641793]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56624359121254, 6.275552104451997]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56462353696755, 6.276437260978925]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56582006428611, 6.281826029674968]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56363138172996, 6.282199284137724]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56173237774742, 6.2827644975288806]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56334170315635, 6.281751378750291]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56019815419090, 6.2809622111775125]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55834206555260, 6.280418324721506]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56185039494407, 6.279362543508426]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56286963436973, 6.279607826203379]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56686076138390, 6.278498720923613]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57104500744713, 6.278871977771876]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57168873761070, 6.281303472977441]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55253776524437, 6.279981082256616]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55033835385215, 6.281228821977819]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54961952183616, 6.281815365257805]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54783853505027, 6.281730049912712]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55120738957298, 6.278999951486829]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55326732609642, 6.279159918586301]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54907235119713, 6.278871977771876]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54540308926475, 6.2793092211681465]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54532798741234, 6.281388788392455]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54863246891868, 6.283020443013506]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55282744381797, 6.275406011033491]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55400761578453, 6.275715282848745]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55012377713096, 6.2761311998280656]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55262359593284, 6.277176323079811]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55454405758750, 6.276984361823423]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55865320179832, 6.275587308326772]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55874976132286, 6.2769310392396545]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55926474545372, 6.276824394055741]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56543372470284, 6.273955731293686]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57309411364938, 6.289824381853267]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57884476977730, 6.289653753776262]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58339379626656, 6.289525782681756]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58656953174020, 6.286497124251250]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57991765338326, 6.286497124251250]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58105491000558, 6.283233831696718]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57579778033639, 6.291594644847038]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57245038539241, 6.288639423956772]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57687070725834, 6.279754141375844]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58678415177738, 6.278154469995254]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59008863328373, 6.279476865355298]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58912303803837, 6.282249618915360]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58107641099369, 6.275744289170390]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57646301148807, 6.275360365531534]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57530429719364, 6.267228939855064]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57408120988285, 6.271921393690463]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58862951157963, 6.268316739730558]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59548959869367, 6.264296171939419]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59900865692121, 6.262589805035743]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59360132354719, 6.258707799556709]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59169030235714, 6.2485836717719385]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59512352989620, 6.248839634021892]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59443688438839, 6.251783190895716]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59791302727169, 6.247133216657431]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58729147957271, 6.245917390891091]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58467364357418, 6.245682757523412]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58563923881954, 6.249778161200453]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58699107216304, 6.251889841196137]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58076834724850, 6.250695356589205]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60157200398670, 6.253803824604122]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60292383733021, 6.255766179066343]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60556313100086, 6.253889144516519]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61004778447376, 6.2513935313273254]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60942215010193, 6.248769925135662]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60354274794129, 6.2467862141597434]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60985130354432, 6.253078604786647]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59207201712833, 6.240398617138981]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59782267325626, 6.240377286612412]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59840203040348, 6.242616987160570]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58511973136173, 6.237582980125138]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58009863608585, 6.242147717362490]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57027892045994, 6.241889875940427]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57366923265477, 6.241207300602285]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57291821413060, 6.246859850801039]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57654456071873, 6.2484382878806555]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56731776170750, 6.246795860008225]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56315497331639, 6.246667878399111]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56360558443089, 6.240588715933931]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57360485963841, 6.243830944697153]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57654456071873, 6.245580033458351]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57467799975477, 6.236845283120560]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57094436480604, 6.234285596383102]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56922775103651, 6.235629433478191]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58354001833997, 6.233773657536388]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58137279345594, 6.230467373786314]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58444124056898, 6.228739565603785]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57281118228040, 6.228910213578634]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55772358514248, 6.235693671207504]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56098515130459, 6.237954722397547]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56006247140347, 6.232003444080903]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55426889993130, 6.233965880235846]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54824200344366, 6.247803006380353]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55317726803106, 6.244816766427425]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55579510402960, 6.244070203777738]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55327508037242, 6.256032531768886]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55750224177989, 6.254112838242749]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55906865184458, 6.252833038642493]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56123232769113, 6.261432686485305]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55561041759591, 6.265591955259855]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55947098872328, 6.270032070136044]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55162135896383, 6.272548923459806]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54702162936677, 6.266806309752613]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54333090976228, 6.268491333489687]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55073997819342, 6.294945816919288]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55829307877936, 6.292045160577717]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55749914491095, 6.287907431599625]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54664156281866, 6.288419317382042]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59940522576126, 6.231265144033908]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59571450615677, 6.226828298563932]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59374040032180, 6.230070612404320]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60235215050545, 6.213069467129345]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59385491234627, 6.2187436517754335]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58243943077889, 6.221431402081872]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60707283837166, 6.222071340605388]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57218266350594, 6.2138800686826725]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58402729851571, 6.214093384673379]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.53422428289011, 6.234543035190986]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56322838489535, 6.2597322367442585]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56043888751987, 6.266045800984366]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58455731098178, 6.256234148022810]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60941137666190, 6.260669736851116]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61743654603445, 6.2597312292262375]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60786642426932, 6.256830376816779]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61816610688650, 6.2551239855240865]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57194862855235, 6.253329350998381]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56782875550547, 6.2587898022722355]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56877289307872, 6.252220189863904]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56576881898204, 6.253798610770094]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54984722626963, 6.258832461823186]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56461010468760, 6.265871240007570]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56894455445567, 6.267065689915949]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55117760194102, 6.263482331989142]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59624496513614, 6.223989234347904]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60615840965518, 6.227658186776746]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59473192019260, 6.215233538827298]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59709226412570, 6.210839221484139]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61391631087454, 6.232818821941681]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61438543993830, 6.247410428368179]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62090857226252, 6.251207197408653]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62275393206477, 6.248519599700495]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64941861347027, 6.294063571354360]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65147854999371, 6.293466377711396]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65868832782574, 6.294020914688337]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63074136922981, 6.294491422045943]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64269329260017, 6.290076442172822]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64022566030647, 6.289777843146089]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63771124832972, 6.2868208542753585]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64335461609706, 6.283003015614775]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64631577484950, 6.285882393738133]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64953442566737, 6.284751973115677]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64440604203090, 6.278468751599474]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64367648117884, 6.279321909765775]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64101572983607, 6.279279251890659]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64026471131190, 6.281028221904550]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63647743218287, 6.281444134640641]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63250776284083, 6.282478582825061]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63406870445479, 6.278872886598685]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63213751396407, 6.274180495345508]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63052818855513, 6.277913082735739]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62563583931197, 6.277742450752681]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63756630501021, 6.2762067603899165]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62241718849410, 6.279704715182264]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61980711227056, 6.280927482524030]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61942087417242, 6.282911063739029]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62180267577764, 6.283656608128233]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62384115462896, 6.283645943748601]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62408255344030, 6.282355552198746]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61817307560723, 6.279153694577992]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61742205708306, 6.280166818412175]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61486859410088, 6.280326785153148]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61898339592890, 6.276774737311208]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61661706027161, 6.275425612588207]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61362371501099, 6.2762894402696165]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61240062770020, 6.275884187955452]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61210022029053, 6.2732287110449265]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61218605097900, 6.275148334263362]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61442837771546, 6.273687288345478]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60812369107833, 6.275132704357425]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60618177175155, 6.275740583587260]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60464754819503, 6.274748780267924]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60271635770431, 6.2748980841141275]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60443703016307, 6.277529012491403]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60589078744914, 6.278856741678645]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60768786748912, 6.278398168928360]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60346245561475, 6.278413407705229]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59956812119731, 6.276373910471423]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59940718865641, 6.273857075617866]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59674937006464, 6.277076471902467]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59783323727711, 6.280169171873356]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60129865132436, 6.279902560530382]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60316546879872, 6.280467776415399]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59580032481115, 6.280201165225335]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59018914355200, 6.281278273594729]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59394423617285, 6.281704850550649]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59298670847588, 6.283385499229192]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59463894922905, 6.284281306805602]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59476769526177, 6.283566793744132]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59025043359807, 6.283905030428087]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58794373384526, 6.284971466779315]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58506503438994, 6.285828761016937]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59374466276213, 6.286724564386121]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58958439625620, 6.287816804611742]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58702372293921, 6.291937778018371]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58319038538541, 6.291415231480401]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58023995546903, 6.292151062168569]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57639172403080, 6.289430873746945]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57261284226719, 6.292138107088217]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57309705028153, 6.285453507211364]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57255524406052, 6.285981391907174]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57084995094347, 6.284335040379669]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56986826244402, 6.284900251450916]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57068242271737, 6.282923971174112]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57261361320809, 6.282950632159799]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57243122299508, 6.283265231687736]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57451798160866, 6.283334550202227]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57527233598353, 6.282835497416035]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57622183797480, 6.282152975601410]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57723571298243, 6.282456911207539]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57587315080286, 6.280926566966735]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57473853706600, 6.280220600265699]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57296143027953, 6.279617152800530]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57365344020538, 6.278801320795805]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57386230924570, 6.278199359423500]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57547699907266, 6.276754318843513]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57433323708932, 6.276276147740924]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57451026288430, 6.2747297884935005]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57660027958111, 6.2730851030385875]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57258690764277, 6.271798561033653]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57646773314700, 6.270366820339644]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57653210616336, 6.269897575457191]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57640385555210, 6.268835132626234]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57484280990543, 6.269933593812606]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57280332374840, 6.268156923535897]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57252973842888, 6.269436685583079]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57032847371394, 6.275184875882019]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57070968112869, 6.273186250214816]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57098863086624, 6.271799851158193]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56823503261293, 6.269450688501764]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56761276012148, 6.269088089583603]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56897530573451, 6.271213445524725]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69979923306798, 6.266209874016314]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.68675296841954, 6.279988531660968]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67319336323588, 6.232836414482317]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69220486073344, 6.231001959568521]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69813507169990, 6.241195526606194]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69777029127387, 6.243413893253074]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69880954669335, 6.2611969547640065]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.71065927961189, 6.251076454355694]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65940393246713, 6.304116498627852]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66126711475738, 6.186570890417513]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66364891636260, 6.189920114960041]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66667444813140, 6.191050740107849]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67238218891510, 6.191200067776649]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67189490098280, 6.195756279394574]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67552124757094, 6.195073644168902]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67557313024194, 6.198303736297852]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66896416722925, 6.199605000968160]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67997037618326, 6.197017212485092]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.68276026008199, 6.198901356796878]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.68273396770671, 6.203005247807405]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67908946217688, 6.206248200569717]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.68227349546464, 6.2074172108683054]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67370525648677, 6.209164563208359]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67124835302913, 6.210145824839946]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66899908239684, 6.212911420231060]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67860201406424, 6.214299214639322]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67129567670767, 6.214789840897871]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67209937057581, 6.218087111645981]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.67296840629663, 6.219466839069479]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66841937980737, 6.2198188066692754]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66501126200825, 6.219448045368183]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65638258178885, 6.215058032394161]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65966379798965, 6.217252424396138]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66229800441458, 6.217483886142677]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66353182056143, 6.218209155189631]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66355866005755, 6.2237237827393885]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66605847885943, 6.222283924493243]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66990994395830, 6.234818863008221]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66478011409797, 6.237071474841842]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66690504499290, 6.239783573082839]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.69397302634306, 6.235059838275208]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64379789000647, 6.222696676109064]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64682342177527, 6.2228139979475765]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63923962347891, 6.231759417309794]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64385480568754, 6.236251756261966]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64779228852140, 6.235035905243359]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63784843447614, 6.2395876469993885]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63899594455665, 6.243961527515471]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63891916386072, 6.250234592198355]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64362912289087, 6.250554543981636]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66552791190398, 6.270659752312745]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66460147463916, 6.270221032341407]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66385716163752, 6.270756930959809]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66231220812416, 6.270610292089113]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66151677384794, 6.271392780489328]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65164421156926, 6.273261728650865]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65272782401128, 6.272931126181589]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65510230196445, 6.269525046195301]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.65563745430845, 6.267121333581862]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.66084898642438, 6.267390617641368]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.64084290890648, 6.2501171302712555]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.63112227762775, 6.248464510320648]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.62930363519322, 6.248757230675862]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54396529463591, 6.244240842291707]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55048842696013, 6.243025009808864]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55150976555547, 6.2404385509056395]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54205766098698, 6.241174453484445]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55572654738987, 6.238291157973983]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.53956892028415, 6.2386217823543655]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54281928278058, 6.232969912048128]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54545643276640, 6.228564579696181]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54811759291637, 6.225241885788403]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.54948015509594, 6.224127332415307]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55608191471010, 6.223572721243314]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56511023025423, 6.226628408214621]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56796410064608, 6.226073799683391]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56575037730599, 6.2282656684121696]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57041470854380, 6.2331314847265915]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56547379789248, 6.234572996370030]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57309931812182, 6.235770184087080]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56881851253405, 6.212567186694393]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57576583545304, 6.207624008347495]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57638728997338, 6.202586079181440]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.58091485879052, 6.202831397823596]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.57385949241157, 6.197100786512400]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56911099801306, 6.196545113228318]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56499086035484, 6.193628926250006]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59099755896324, 6.191751669690875]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59181908800626, 6.187279060341510]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56932927414313, 6.182354711543203]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56711963842196, 6.188162459529790]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56821655086590, 6.1914801051362724]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55940652044278, 6.195010023112033]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.55826979378092, 6.199303885811909]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56425810488761, 6.201781088969060]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.56902203477800, 6.200615533941022]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.60571465410173, 6.194823825995377]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.59676223955331, 6.1937586001218365]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61931601311281, 6.207599190471034]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-75.61077615022582, 6.2068459145603185]),{"LC":0})
]);

var vegetation = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-75.59137070112381, 6.243594329233522]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58729374342117, 6.242165190751126]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58926784925613, 6.242133195068819]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58987939291153, 6.240661391570923]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58090093441938, 6.234854427977258]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57866933651898, 6.234811766472061]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57851825123922, 6.236729248844129]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58153305417196, 6.238105075606511]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57718787556783, 6.236558603412604]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58777295230368, 6.234862811418754]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58935009120444, 6.2373051767654575]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58784805415610, 6.234009580668964]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58941446422080, 6.234873476794345]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59064712973192, 6.230238335660902]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58902707548692, 6.230387652215571]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58816789830243, 6.225777983851324]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59118212003374, 6.219622342236667]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59062422055864, 6.217190560374617]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59573114652300, 6.220496927700319]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60021579999590, 6.219494353997992]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60090244550370, 6.220283614306766]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60273707646990, 6.221531496431019]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60055912274980, 6.222278091157160]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60420947389600, 6.216474779402135]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60066895799635, 6.216848080488033]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61066748783811, 6.215493469782708]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61968362307076, 6.231421857548229]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58725699289516, 6.253613742918051]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59850081308560, 6.253613742918051]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59491738184170, 6.257922382655085]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57771472960737, 6.2584988572083855]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58239250212934, 6.262487512378012]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58490304976728, 6.265281685818816]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58092038758672, 6.2674424983745896]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58514754899419, 6.271239121820581]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58959342896428, 6.272295879556426]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59815504013982, 6.275324620610377]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57893708602020, 6.283253918120407]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57346537962982, 6.278476250465522]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57892951191480, 6.270427441589880]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56300791920239, 6.271173966582157]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56382331074292, 6.2695102808505485]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56716391783463, 6.288596838888178]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56497523527848, 6.2883408961473535]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56544013938803, 6.2933958503650125]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56196487064373, 6.296476707195850]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56080615634930, 6.295943501096203]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60564775584707, 6.266426995256111]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62113991295814, 6.271963897799946]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63654652153969, 6.259848749986170]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63585758577484, 6.2442883579171715]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61009538493924, 6.203065062063070]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59595477901273, 6.2029556401454204]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59398067317777, 6.2059847819515115]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58925998531156, 6.207840656004813]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57274090247577, 6.192508789841129]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57119595008320, 6.188263611602840]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57411419349140, 6.188732929467167]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57617413001483, 6.186016619221930]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56474279328746, 6.186409872915657]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56148122712536, 6.191017719157443]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55841278001232, 6.189993756798808]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55338405195427, 6.192224475577260]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55381320539665, 6.195040355391416]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55065892759514, 6.195061687756932]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54965745523158, 6.202960053200230]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55449687781599, 6.203404476262373]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55902444663313, 6.201868568031612]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56114875617293, 6.200631305369683]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56177102866438, 6.204492408551546]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56340181174544, 6.203319148144718]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56022607627180, 6.207670864529894]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55702888312605, 6.207393550342284]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56133456850790, 6.210269474434669]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56275077486777, 6.2159650207946004]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56303069403906, 6.221694623912950]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57234634880545, 6.2194574218335426]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61138483010710, 6.238142345758889]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61885210000456, 6.241299267710153]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61537595712126, 6.236990491122998]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56489044705887, 6.2527387565460915]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55321747342606, 6.252717426522368]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55012756864090, 6.252376146024518]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54881865064164, 6.254658455117861]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55742843489254, 6.257463406056607]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55412395338620, 6.260044309172295]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55453164915646, 6.260812178712349]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55154860434747, 6.2619505418264385]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56541171772946, 6.262760343545288]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56787935002316, 6.265021277752992]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57326522572507, 6.264829312021475]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57418790562619, 6.262248432553822]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57652679188718, 6.264274743956023]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56909916969808, 6.285419065323600]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57652352425130, 6.2832435347200075]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55032370659383, 6.290239326204463]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54740546318563, 6.2903459686390155]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55135367485555, 6.291604347714340]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55137513252767, 6.289418178725550]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55413244339498, 6.289610135395234]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54411171051534, 6.294089104227388]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55145976218373, 6.297557705305951]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55442092093617, 6.299797160281764]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55680452746186, 6.2945486279614355]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56010900896821, 6.293823464839930]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56412376748719, 6.2931065054451825]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.52709961169202, 6.220945464552647]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.52615547411878, 6.226576902018341]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.53920173876722, 6.226491577658663]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54997349017103, 6.228880654488429]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55439377062757, 6.227728779516898]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54840956853928, 6.240636561070064]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54351721929612, 6.240145958962051]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56262924906748, 6.230400082496602]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56494667765635, 6.231359973596615]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55208090073354, 6.213148505134689]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59893544808062, 6.200472014108246]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61684466963062, 6.196413781034180]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62353946333180, 6.198845658819139]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62143707058420, 6.211411475217605]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61099034958579, 6.228553694452154]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60347004926942, 6.2372496121329695]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60053034818910, 6.233239433790652]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59575775425861, 6.245651418070132]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59356907170246, 6.246078024140519]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60477972501072, 6.248594992878595]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61121702664646, 6.245886051451856]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60016632550510, 6.251197269861788]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59996552520495, 6.259485395452859]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60738987975817, 6.258781513296343]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59273428970080, 6.255901985508881]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61187453323107, 6.258546885700086]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59966172325419, 6.278332565215710]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59783782112406, 6.2829609326976374]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59657181846903, 6.278631170810999]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58433167000746, 6.286677049527183]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59025398751234, 6.287700823010461]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58896652718519, 6.289556407311288]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55376623846453, 6.286974272609651]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55644844747943, 6.285076021695185]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56537483908099, 6.285140007793883]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60442945193054, 6.199433411392337]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56940798991363, 6.2046616660630125]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56972985499542, 6.207733461768947]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57348494761627, 6.208202762313473]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57591776725616, 6.211068304404395]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57907204505767, 6.213478782945882]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58340649482574, 6.210790992005822]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54627524702875, 6.256691705165930]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54363595335809, 6.254857333815040]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54355012266961, 6.258910006105083]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54636107771722, 6.261469572406957]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54816757845578, 6.245250941378580]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55342040427759, 6.250519506008486]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55736861594751, 6.246957364879577]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56693058042802, 6.235753118238463]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56622247724809, 6.238291467200193]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56954386054394, 6.217746364424215]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64773370499150, 6.245197930973388]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60164262527958, 6.242126354346287]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61511046781392, 6.250372383687767]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61049145577265, 6.255765431736409]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62407535235513, 6.258508014838798]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61589282192054, 6.2659805054061435]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62207263149085, 6.265852528494873]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63112776912513, 6.266663048402816]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61683522938725, 6.278380952035609]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60417561039056, 6.284169287169115]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60710089218206, 6.2911291329262715]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61564104568548, 6.284687900343914]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62533991348333, 6.284687900343914]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62486784469671, 6.280123534933428]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62565289105173, 6.274663746288119]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60994587506052, 6.279484106784171]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59833113156410, 6.291918286218947]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54708560961086, 6.279112539816848]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54275115984280, 6.274548125531046]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55886191842100, 6.278309543837520]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57052762257854, 6.268256620928130]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57646968974531, 6.254298895572117]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57440629771018, 6.245662812384048]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56207338480517, 6.240577417525048]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55133499042776, 6.234608349419842]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58034790122731, 6.223922224502767]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59842066443363, 6.228755015717164]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60930686324532, 6.225290105882519]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62001033281184, 6.222494926429610]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62340522445880, 6.242446103338177]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62734443016157, 6.2397082992480435]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58225269410103, 6.196085316393806]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58482761475533, 6.1994984771478645]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59085722062080, 6.199477144961732]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58813209626167, 6.1959573224360485]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59345359894722, 6.194826707794375]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59643621537178, 6.197045270087542]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59837138701683, 6.1940974486478355]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59871802858144, 6.1909360472140955]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58788005863497, 6.189307388954820]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68266778706935, 6.248023164571416]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.69794564961818, 6.257920290954279]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68215280293849, 6.272594995266633]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.69125085591700, 6.229764181841792]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66327005147365, 6.2195252218607875]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66241174458888, 6.244183711689510]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66925563006059, 6.266596146819728]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66463571549052, 6.280310911954664]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67682367325419, 6.287733314890456]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65184694290751, 6.283510236548197]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65609556198710, 6.288373172253989]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65476518631571, 6.275191951714842]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64721208572978, 6.276386380270542]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67137342453593, 6.283382263942051]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64064603806132, 6.2722485268019135]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63948732376689, 6.276471696491152]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63880067825907, 6.280993436184702]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63716989517802, 6.288202543700715]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63237508626663, 6.288511996925189]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63772022611857, 6.295181294264836]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62686660007306, 6.295812491644832]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57141898886455, 6.277283713149045]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56571124808086, 6.280024485027678]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57117560717735, 6.2663545424910705]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55726631500413, 6.266034738188431]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55581602223750, 6.267302803881098]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55672797330256, 6.268439814964381]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55341221905107, 6.273016372027594]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55357851600999, 6.272333837345768]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55222212613714, 6.274563948418321]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55575727761877, 6.2749478726440024]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55524229348791, 6.2749851985953065]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54960316178153, 6.275849646257812]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54778473340795, 6.2745047879837355]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54701225721166, 6.275725879470335]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54848055571185, 6.2770820336014586]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55094133423833, 6.278837076636176]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55493151434695, 6.279157010886038]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55653759724905, 6.279236070161801]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55415925743696, 6.2810324103492245]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55314538242934, 6.281480316355325]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55587587120650, 6.281953906123965]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55693802597640, 6.282375150323300]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55801153845546, 6.281710978090597]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55281878180263, 6.284062130065168]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55309236712215, 6.284947272123638]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55108277897620, 6.285437413949092]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55223076443457, 6.285725351131222]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55781270656699, 6.285672029442853]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.56048698319690, 6.286678106745481]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55894239868364, 6.287432327420219]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55977388347826, 6.288888002622910]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55678676231034, 6.2924628240816345]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54451751997253, 6.298023475885974]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54306912710449, 6.298716640931832]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66699787207696, 6.260962798531868]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68743961392735, 6.264418195190101]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.70117252408360, 6.276959817721501]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.70778148709630, 6.271072971242936]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.71396129666661, 6.273120577560004]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.71490543423985, 6.256312904634599]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.70494907437657, 6.249828581675844]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.71893947659825, 6.247780884040612]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66948130390060, 6.221079893220895]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67255394656614, 6.2152426761876285]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67577165655835, 6.214164967178624]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67289632849439, 6.213055723233531]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67288900476046, 6.211189950086353]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66751385789462, 6.211392601315341]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67214439236436, 6.208196799882875]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67022254048844, 6.205099138058623]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66601683675309, 6.204907150391800]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66822297378800, 6.203170662686925]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66524035736344, 6.202104059750569]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66231112163229, 6.202381376721610]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65947494507311, 6.202960038157275]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65877420422187, 6.205753036258217]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65794265198255, 6.210252037861373]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65448803840087, 6.212083880939654]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65590145220975, 6.214594558966791]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65985888333852, 6.219527162533184]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65666972779583, 6.221405069349569]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65877011534296, 6.222988520006916]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66228801460431, 6.222837148060054]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66345703084560, 6.225645470910993]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66620424890745, 6.224275971139946]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66628910996496, 6.227136943558890]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66298423895046, 6.230198736534611]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66199141218236, 6.2330832898181185]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66673420848467, 6.234488236229700]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67382423236857, 6.243292586557749]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.67676828418415, 6.240973084831728]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68081312935547, 6.238783495054918]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68390312039796, 6.239252256177917]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.68768167801757, 6.236726815486409]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.69187682422557, 6.2350857317273904]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63702336576075, 6.254106483660839]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62796822812648, 6.2646007222840465]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62487832334132, 6.261038677120308]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61951390531154, 6.269086121829980]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.60661784436793, 6.2713256993613316]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57785156181214, 6.219062659137377]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64339624780415, 6.210848864405709]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63369738000630, 6.218560226944510]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62957750695942, 6.218346912765170]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63383685487507, 6.227039395456648]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63181983369587, 6.213429996952872]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61564074891804, 6.211488815803982]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61100589174030, 6.220021426746130]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61571585077046, 6.2191148434057535]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65470024221531, 6.254786999921519]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65165325277440, 6.255885490663210]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65706058614842, 6.253805821773347]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66000833385579, 6.2575906036507085]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65061015009803, 6.259455721173980]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65044140273436, 6.257662922249153]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64876233989104, 6.2578228958923265]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65532184959567, 6.251728495781423]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65157581405322, 6.251477867463626]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66920063308896, 6.272574917217842]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66539648366225, 6.270267826438552]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62880742652547, 6.248479938189101]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62782611795340, 6.247904400225532]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62632860942107, 6.247569713041237]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62608450267422, 6.246323738897808]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62656895403853, 6.245561360697176]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62766303674995, 6.244877023464368]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.63161124841987, 6.244759706560548]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.66248883859932, 6.252246605349228]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64757575647651, 6.234009100596893]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65510739939033, 6.231129436567840]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62815656320869, 6.231428069127618]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61942329065620, 6.228804362969236]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65149932918470, 6.221380526480734]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64909606990736, 6.206021766861071]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.53657165593390, 6.212690399727236]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54112068242316, 6.222246892848143]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54863086766485, 6.220903021497677]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.55777183598761, 6.224593326649531]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.53369632786993, 6.242169915362945]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54586291477052, 6.249690136109587]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.54541766807405, 6.248069042380220]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58075177816481, 6.280868813427917]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58345544485182, 6.277328208419813]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59190976766676, 6.2774028599786265]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.57225457259335, 6.275472592060457]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.59497824736752, 6.2686579018780595]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.61823836394467, 6.280751516152458]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.62062016554990, 6.287299440540140]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.58929196425595, 6.284132132355545]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.65570345319989, 6.271255744422149]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-75.64638009466412, 6.270349249791781]), {"LC":1})
]);

var Bogota_urban = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-74.15241758499921, 4.665534688583207]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14492885742963, 4.668806826475328]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13325642539223, 4.667370565266903]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13698310788524, 4.653416575109627]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12193094025870, 4.650649053787365]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10982912914841, 4.633563709564521]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07263126268059, 4.659033215696793]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09179686315657, 4.604858446116321]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13645492310215, 4.612092823129977]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12765727753330, 4.6031952801182126]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13924854555916, 4.592616967805826]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13363325816982, 4.583988789425249]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12973759942800, 4.565900013201801]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14389667130048, 4.555535556772509]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16329285103865, 4.572174587992837]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18228351020262, 4.575905451698456]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18823644131894, 4.586492019793384]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.19287091377697, 4.582508602603284]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18456333722705, 4.5624510718917115]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16784892135583, 4.546459555545402]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16886196455155, 4.539138125323179]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17238638719712, 4.534832613917403]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16698738268458, 4.5242190522685375]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16272045942573, 4.511774907662208]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14802285883107, 4.5091160556357535]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14828950559219, 4.502619784215513]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17074575951630, 4.495084105161976]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14888075442717, 4.482910662653372]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14968527582760, 4.479138147702990]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15612866446396, 4.457489659253527]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14336828303000, 4.450994167891408]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15595043573911, 4.444627480860332]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14775682500724, 4.439555198427695]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15642198308295, 4.428664913258354]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15746124772375, 4.424303594897509]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17730203779976, 4.394623769157665]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18590575757650, 4.393636398819020]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.19028842438453, 4.363820620798396]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13661642447870, 4.3493787566272095]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10631304509381, 4.504191465195746]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11347990758160, 4.515528819851593]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09101372487287, 4.516576981436209]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08815855262466, 4.5317543079946105]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09057880275282, 4.540550396005338]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08455778979466, 4.545810738119652]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09380088648062, 4.548866733688615]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09344536302012, 4.551783161127917]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09880527284052, 4.5539415848902856]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09204268173542, 4.563734816108986]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09361505802643, 4.579535991635871]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10113668689836, 4.586682075875775]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09886217365373, 4.598488680686151]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07216882953752, 4.590788743190434]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07809114704240, 4.581420373872078]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06929350147355, 4.5817198213670745]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07641222588000, 4.610936763494560]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11533644310413, 4.620604175585093]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11387732140003, 4.610380669414633]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14057937770914, 4.626332819404398]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14159117342311, 4.639549495319856]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14539894854988, 4.645650101341699]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15299496448006, 4.656870212665797]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16716168411827, 4.666962019266286]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17302968867195, 4.680533160346097]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17319942973758, 4.691832103182263]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14429977493010, 4.699951196305168]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13783504901936, 4.7120922292634795]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11908279118877, 4.727734899178070]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12590440758309, 4.7439071861357425]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11493431688169, 4.751892552606209]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09824024797300, 4.755313970847333]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09488873010774, 4.7680307470326335]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09045629354875, 4.787566612613445]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09410391435587, 4.802510299485960]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08390079126322, 4.809170865341979]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06898932316516, 4.808651517596499]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06993899838201, 4.799960851865862]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06344805256597, 4.802783325238630]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06570839129986, 4.796398893685957]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06044318045396, 4.793345779692335]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07360515033412, 4.789523671350774]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.05824446483910, 4.778836835290194]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.04792062701988, 4.781643389169595]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.04569067997788, 4.773792497941066]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.03367536748780, 4.769469011706955]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.03780743070531, 4.7582325436885755]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.03440439798536, 4.752996782679088]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.04815876581372, 4.7498747287147784]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06154660401043, 4.750684088590755]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06294549476874, 4.744293391403119]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.05340696451975, 4.727433866202071]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10131822657257, 4.686758862624411]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09778709948654, 4.709556830450219]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.05587225256195, 4.675498741501401]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07014283594492, 4.638365490094675]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07277593477738, 4.622169483058085]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.07400874454183, 4.599061788868979]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18986513227242, 4.629511994204529]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.19866442868992, 4.614409262066761]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18776393125340, 4.6030965140851485]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.19802069852635, 4.598063936797262]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.21576610072057, 4.608201882229234]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16952771607338, 4.641280328803162]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06050169365639, 4.698882717682311]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06494480825873, 4.691753647119357]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06637854811750, 4.686122873638574]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.06275550520680, 4.681453143984089]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09087336340120, 4.681930422363005]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.05713854270886, 4.6487991292313176]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17286129737984, 4.620116617065374]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14368789552280, 4.545851238826468]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13860242723057, 4.542610620611381]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14100214604751, 4.537888168980572]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13764979602084, 4.533042133499651]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14316441775546, 4.530742645628027]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14237044448544, 4.525985277935125]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12180554057126, 4.523888515971492]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11192010259985, 4.499245702237102]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08956889963544, 4.502112646747798]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08326034403241, 4.501363945151143]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08279900408185, 4.509481968479023]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.08927106909329, 4.514113146542635]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10047599036535, 4.488069265307328]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10536790056246, 4.4776367205310175]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09782920169390, 4.472563238898138]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.09492526458983, 4.466181167472580]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11883083082155, 4.4687923044495355]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13195219732240, 4.4687816082299054]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.14992087570648, 4.4749625855537465]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15760344774900, 4.468809620747890]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16829068696006, 4.484214220535447]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18867610705158, 4.512289431218603]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.19317665377473, 4.496931284546521]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11774691233262, 4.586099376045531]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11903795388122, 4.641723680689194]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11063020104864, 4.658861239940730]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10888317918277, 4.670552724442875]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.10582320280700, 4.682125787797715]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12908411149853, 4.7016394834851685]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.12517926176625, 4.708141970652927]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.11779788325067, 4.720566700430249]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16458829566372, 4.602348527590986]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16982396766079, 4.6126833524566315]),{"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16586055798622, 4.630620613742401]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.17837895526095, 4.647498118232193]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.18199441792770, 4.653731972519119]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.21061285620732, 4.580333150264569]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.13840032677128, 4.409878017679247]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.15226507962136, 4.407096773376054]), {"LC":0}),
  ee.Feature(ee.Geometry.Point([-74.16147758982562, 4.401829917704983]), {"LC":0})
]);

var Bogota_vegetation = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([-74.11641927050341, 4.737688753850253]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10513253496875, 4.740041029129155]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08281655596484, 4.729562650420325]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08028455065478, 4.744831092209474]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13040967272510, 4.752187195781085]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06415689336416, 4.777214277958416]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.05472822298394, 4.803397840659816]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.05063443783511, 4.743383281898315]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.03599622126232, 4.745180907482996]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.04086877868448, 4.7128446528793795]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07743265197550, 4.703520676498638]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09522348308230, 4.6944626900278115]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12214708912322, 4.698958500662348]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12914229023406, 4.694424749275492]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11848807729115, 4.679590143440951]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13337970174183, 4.671677225748002]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11558660359772, 4.665664753774788]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09623178334625, 4.6595053951669785]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10078080983551, 4.669428779659972]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08259429486033, 4.659756926307702]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08506200919176, 4.642925514701205]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06925313618292, 4.648344959315056]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09884920318872, 4.637872939899377]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08902437689200, 4.627913006990410]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07505543234244, 4.631784172534289]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06711605004999, 4.6251841093738255]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06149238255607, 4.622354481035245]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07728294831541, 4.620486421160647]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09485298114768, 4.622477510665206]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10671268245297, 4.618141993101389]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11572846971600, 4.617805319800158]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12694210604184, 4.623891737505463]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12634203687668, 4.630786738593314]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13172351468472, 4.635664906731113]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12448881434621, 4.643442332785674]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13218196828950, 4.642582360599112]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14160188634980, 4.645384087336946]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14421972234834, 4.659928004041771]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17289621458059, 4.666774732477654]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.19107308581812, 4.669668898797807]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.18028993490294, 4.640716103942115]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15263673970212, 4.592646155554491]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16405222126950, 4.578168015214148]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17066118428220, 4.562168708577833]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13310516142991, 4.554444450179106]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10353691613923, 4.555756647515320]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09960774711034, 4.526013641677692]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09531246536618, 4.512387053992979]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11448682797507, 4.5076586229265585]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12486875521435, 4.513564109037069]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12912748524806, 4.478663838716997]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12796526779098, 4.460147190438331]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11715091677598, 4.4535996643923745]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16786265138849, 4.375667098132858]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15241312746271, 4.375538727352397]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17478841835226, 4.357062537744733]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15624527024520, 4.340524932829699]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17004706891228, 4.3351160938286135]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17356612713982, 4.329467454399158]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14375781380795, 4.353444536775346]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14348683589235, 4.391761511156801]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13340172999635, 4.418343003030005]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15446874511404, 4.4322589906547085]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15748356376032, 4.450111729517133]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15047279271060, 4.4650743391691625]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15646254881734, 4.485632726929659]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13490629382454, 4.501215302813253]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13427462251740, 4.518713640038907]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12214429756891, 4.540671646753433]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15391891021986, 4.542420151568531]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15813534279127, 4.542216943946754]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15860007648129, 4.536360833455430]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15650795344968, 4.538328752409358]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16232800421116, 4.537856020302912]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16665172514317, 4.534700928190643]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16408532529220, 4.532219149781461]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16843050389633, 4.530293995451505]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15719807341341, 4.527280773793236]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16294872954134, 4.525826203286547]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15094587774824, 4.521760241262997]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14507108876100, 4.5218676949476375]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15478068539491, 4.515621530732467]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17112370233957, 4.509623796111930]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17913126977854, 4.498728533461774]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15709424051218, 4.502771527572678]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15115046533518, 4.493615932052587]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17280499909387, 4.487118136480697]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16235511277185, 4.486904217416863]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08800889996454, 4.590559731404646]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10779287365838, 4.596398860168584]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10183981450727, 4.606840405616588]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.08248962623519, 4.612727450642310]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.19488310352080, 4.619572767935964]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.20930265918486, 4.6207704929773215]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.20578360095732, 4.604258819649677]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.22586798206083, 4.619529992004204]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15467142596952, 4.626053291773790]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13647425845289, 4.6350588097689975]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15280045139906, 4.645343983892987]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16140497791883, 4.645301209520208]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16479700993874, 4.656607516567368]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15700787495949, 4.663344340057407]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16926020573952, 4.663579593044006]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11194156027197, 4.500775196272409]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12098596907019, 4.497106544351406]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.10722607508280, 4.491780013928722]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11682838335612, 4.4906890330167935]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13927974566866, 4.469928430508912]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14653056351166, 4.473347468223835]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15685346148395, 4.403840986562478]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15047668146534, 4.411013645634526]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14366086902570, 4.425728679337265]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16298990027452, 4.427612302040346]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15485549672836, 4.437860420024003]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14360730771219, 4.440508486565583]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13377678604760, 4.449310490844429]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15557374284441, 4.479573255142728]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12759273005345, 4.496512485741880]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15131820250299, 4.508402696867804]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14052189297261, 4.529978603280297]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14267458216968, 4.5524563444565285]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.13673261988474, 4.561556438363311]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14239617015252, 4.576595215293010]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12650613393858, 4.598243723146744]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07326788477695, 4.593091130161481]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06644977129372, 4.599122735445049]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06872428453835, 4.610953917553788]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.05861775355362, 4.692422908170671]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.04784600214981, 4.690840360832849]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.05258751401233, 4.7617340485818485]),{"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07524681577014, 4.801848530587383]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09962273129749, 4.797058865336543]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12779325331861, 4.730808601985442]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.12675938483795, 4.717776735738946]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.14165074963742, 4.703950794423640]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.15126666372885, 4.686697912579667]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17484395698325, 4.600314134764035]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.18830484888306, 4.576018186372248]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.17559784683890, 4.570277743848814]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.21407311914288, 4.592703260350876]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.19033759245731, 4.605485121121378]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.16979489914104, 4.620913855828694]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.18743493205719, 4.653548037150176]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.09919752802826, 4.682074077061477]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.11029162571062, 4.761892616818159]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.06812777519120, 4.793283033289351]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07791247367753, 4.782249508540016]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.07207598686112, 4.812783710815250]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.05722727775468, 4.786355026908710]), {"LC":1}),
  ee.Feature(ee.Geometry.Point([-74.03535852038947, 4.781314492298441]), {"LC":1})
]);

// ── 1. STUDY AREAS (AOI) ─────────────────────────────────────────────────────

// Medellín – training area
var aoi = ee.FeatureCollection("FAO/GAUL/2015/level2")
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Antioquia'))
  .filter(ee.Filter.eq('ADM2_NAME', 'Medellin'));

// Bogotá – independent generalization test city
var aoi_test = ee.FeatureCollection("FAO/GAUL/2015/level2")
  .filter(ee.Filter.eq('ADM0_NAME', 'Colombia'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Cundinamarca'))
  .filter(ee.Filter.eq('ADM2_NAME', 'Santafe De Bogota D.c.'));

Map.centerObject(aoi, 11);
Map.addLayer(aoi,      {color: 'red'},  'Medellín AOI');
Map.addLayer(aoi_test, {color: 'blue'}, 'Bogotá AOI');


// ── 2. GROUND CONTROL POINTS (GCPs) ──────────────────────────────────────────
// GCPs are defined above as inline FeatureCollections.
// LC property is already set (0 = Non-Vegetation, 1 = Vegetation).

// Merge Medellín training GCPs
var allGCPs_medellin = urban.merge(vegetation);

// Merge Bogotá test GCPs
var allGCPs_bogota = Bogota_urban.merge(Bogota_vegetation);


// ── 3. SENTINEL-2 PREPROCESSING ──────────────────────────────────────────────

/**
 * Cloud mask using the QA60 bitmask band (bits 10 and 11 flag clouds and
 * cirrus respectively).  Applies surface-reflectance scaling (÷ 10 000)
 * and returns only the spectral bands used downstream.
 */
function maskS2clouds(image) {
  var qa            = image.select('QA60');
  var cloudBitMask  = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
               .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  return image
    .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'])
    .updateMask(mask)
    .divide(10000)
    .copyProperties(image, ['system:time_start']);
}

/**
 * Compute four spectral indices for vegetation / built-up discrimination:
 *   NDVI  – Normalized Difference Vegetation Index
 *   EVI   – Enhanced Vegetation Index
 *   SAVI  – Soil-Adjusted Vegetation Index (L = 0.5)
 *   NDBI  – Normalized Difference Built-up Index
 */
function addOptimalIndices(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var evi  = image.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
    { 'NIR': image.select('B8'), 'RED': image.select('B4'), 'BLUE': image.select('B2') }
  ).rename('EVI');
  var savi = image.expression(
    '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
    { 'NIR': image.select('B8'), 'RED': image.select('B4') }
  ).rename('SAVI');
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI');
  return image.addBands(ndvi).addBands(evi).addBands(savi).addBands(ndbi);
}

/**
 * Compute GLCM texture features (window 3 × 3) on the NIR band (B8):
 *   texture_contrast – local intensity variation
 *   texture_entropy  – randomness / disorder in pixel values
 */
function addTexture(image) {
  var nir     = image.select('B8').multiply(10000).toUint16();
  var texture = nir.glcmTexture({size: 3});
  return image.addBands(
    texture.select(['B8_contrast', 'B8_ent'])
           .rename(['texture_contrast', 'texture_entropy'])
  );
}


// ── 4. SENTINEL-2 IMAGE COMPOSITES ───────────────────────────────────────────
// Dry-season windows (Nov–Mar) minimize cloud cover over both cities and keep
// phenological conditions consistent across the three time periods.

// Post-corridors composite (after the green corridors programme)
var s2Collection_medellin        = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate('2024-11-01', '2025-03-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2clouds).map(addOptimalIndices);
var s2Image_medellin             = s2Collection_medellin.median().clip(aoi);
var s2Image_medellin_texture     = addTexture(s2Image_medellin);

// Pre-corridors composite
var s2Collection_medellin_before = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
    .filterBounds(aoi).filterDate('2015-11-01', '2016-03-01')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .map(maskS2clouds).map(addOptimalIndices);
var s2Image_medellin_before         = s2Collection_medellin_before.median().clip(aoi);
var s2Image_medellin_texture_before = addTexture(s2Image_medellin_before);

// 2020 mid-point composite
// NOTE: reuses the post-period collection median to maintain consistency
// with the classifier's training data.
var s2Image_medellin_20         = s2Collection_medellin.median().clip(aoi);
var s2Image_medellin_texture_20 = addTexture(s2Image_medellin_20);

// Bogotá – same temporal window as post-period (cross-city generalization test)
var s2Collection_bogota    = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi_test).filterDate('2024-11-01', '2025-03-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(maskS2clouds).map(addOptimalIndices);
var s2Image_bogota         = s2Collection_bogota.median().clip(aoi_test);
var s2Image_bogota_texture = addTexture(s2Image_bogota);


// ── 5. TERRAIN LAYERS (SRTM) ─────────────────────────────────────────────────

var dem_medellin       = ee.Image('USGS/SRTMGL1_003').clip(aoi);
var elevation_medellin = dem_medellin.rename('elevation');
var slope_medellin     = ee.Terrain.slope(dem_medellin).rename('slope');
var aspect_medellin    = ee.Terrain.aspect(dem_medellin).rename('aspect');

var dem_bogota       = ee.Image('USGS/SRTMGL1_003').clip(aoi_test);
var elevation_bogota = dem_bogota.rename('elevation');
var slope_bogota     = ee.Terrain.slope(dem_bogota).rename('slope');
var aspect_bogota    = ee.Terrain.aspect(dem_bogota).rename('aspect');


// ── 6. FEATURE STACKS ────────────────────────────────────────────────────────
// Fixed band order (must match feature_cols in land_cover_classification.py):
//   B2, B3, B4, B8, B11, B12, NDVI, EVI, SAVI, NDBI,
//   elevation, slope, aspect, texture_contrast, texture_entropy

var featureStack_medellin = ee.Image.cat([
  s2Image_medellin.select(['B2','B3','B4','B8','B11','B12']),
  s2Image_medellin.select(['NDVI','EVI','SAVI','NDBI']),
  elevation_medellin, slope_medellin, aspect_medellin,
  s2Image_medellin_texture.select(['texture_contrast','texture_entropy'])
]).clip(aoi).toFloat();

var featureStack_medellin_before = ee.Image.cat([
  s2Image_medellin_before.select(['B2','B3','B4','B8','B11','B12']),
  s2Image_medellin_before.select(['NDVI','EVI','SAVI','NDBI']),
  elevation_medellin, slope_medellin, aspect_medellin,
  s2Image_medellin_texture_before.select(['texture_contrast','texture_entropy'])
]).clip(aoi).toFloat();

var featureStack_medellin_20 = ee.Image.cat([
  s2Image_medellin_20.select(['B2','B3','B4','B8','B11','B12']),
  s2Image_medellin_20.select(['NDVI','EVI','SAVI','NDBI']),
  elevation_medellin, slope_medellin, aspect_medellin,
  s2Image_medellin_texture_20.select(['texture_contrast','texture_entropy'])
]).clip(aoi).toFloat();

var featureStack_bogota = ee.Image.cat([
  s2Image_bogota.select(['B2','B3','B4','B8','B11','B12']),
  s2Image_bogota.select(['NDVI','EVI','SAVI','NDBI']),
  elevation_bogota, slope_bogota, aspect_bogota,
  s2Image_bogota_texture.select(['texture_contrast','texture_entropy'])
]).clip(aoi_test).toFloat();

// Sanity check – band names must be identical across cities
print('Feature bands match:',
  featureStack_medellin.bandNames().equals(featureStack_bogota.bandNames()));


// ── 7. SAMPLE FEATURES AT GCP LOCATIONS ──────────────────────────────────────

var sampledGCPs_medellin = featureStack_medellin
  .sampleRegions({ collection: allGCPs_medellin, properties: ['LC'],
                   scale: 10, geometries: true, tileScale: 4 })
  .map(function(f) {
    var c = f.geometry().coordinates();
    return f.set({ longitude: c.get(0), latitude: c.get(1),
                   city: 'Medellin', dataset: 'training' });
  });

var sampledGCPs_bogota = featureStack_bogota
  .sampleRegions({ collection: allGCPs_bogota, properties: ['LC'],
                   scale: 10, geometries: true, tileScale: 4 })
  .map(function(f) {
    var c = f.geometry().coordinates();
    return f.set({ longitude: c.get(0), latitude: c.get(1),
                   city: 'Bogota', dataset: 'test' });
  });

print('Medellín sampled GCPs:', sampledGCPs_medellin.size());
print('Bogotá sampled GCPs:',   sampledGCPs_bogota.size());


// ── 8. EXPORTS – FEATURE STACKS (GeoTIFF) ────────────────────────────────────

var baseExport = { folder: 'GEE_Exports', scale: 10,
                   region: aoi, maxPixels: 1e13 };

Export.image.toDrive(Object.assign({}, baseExport,
  { image: featureStack_medellin,        description: 'S2_Medellin_Texture_after'  }));
Export.image.toDrive(Object.assign({}, baseExport,
  { image: featureStack_medellin_before, description: 'S2_Medellin_Texture_before' }));
Export.image.toDrive(Object.assign({}, baseExport,
  { image: featureStack_medellin_20,     description: 'S2_Medellin_Texture_20'     }));


// ── 9. EXPORTS – TRAINING / TEST CSV ─────────────────────────────────────────

var csvCols = [
  'longitude','latitude','LC','city','dataset',
  'B2','B3','B4','B8','B11','B12',
  'NDVI','EVI','SAVI','NDBI',
  'elevation','slope','aspect',
  'texture_contrast','texture_entropy'
];

Export.table.toDrive({
  collection: sampledGCPs_medellin, description: 'Medellin_Training_Optimal',
  fileFormat: 'CSV', selectors: csvCols });

Export.table.toDrive({
  collection: sampledGCPs_bogota,   description: 'Bogota_Test_Optimal',
  fileFormat: 'CSV', selectors: csvCols });


// ── 10. LANDSAT-8 THERMAL (LST) ───────────────────────────────────────────────
// ST_B10 (Collection-2 Level-2) is exported as raw DN.
// Conversion to °C is done in Python: T_K = 0.00341802 × DN + 149; T_C = T_K − 273.15

var l8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(aoi)
  .filterDate('2015-11-01', '2025-02-01')
  .map(function(img) {
    var qa   = img.select('QA_PIXEL');
    var mask = qa.bitwiseAnd(1 << 3).eq(0)       // cloud shadow
               .and(qa.bitwiseAnd(1 << 5).eq(0)); // cloud
    return img.updateMask(mask);
  });

var termalBefore = l8Collection
  .filterDate('2015-11-01', '2016-03-01').median().clip(aoi).select('ST_B10');

var termalAfter = l8Collection
  .filterDate('2024-12-01', '2025-02-01').median().clip(aoi).select('ST_B10');

Export.image.toDrive({
  image: termalBefore, description: 'termalBefore',
  folder: 'GEE_Exports', scale: 100, region: aoi, maxPixels: 1e13 });

Export.image.toDrive({
  image: termalAfter, description: 'termalAfter',
  folder: 'GEE_Exports', scale: 100, region: aoi, maxPixels: 1e13 });

Export.image.toDrive({
  image: dem_medellin, description: 'dem_medellin',
  folder: 'GEE_Exports', scale: 30, region: aoi, maxPixels: 1e13 });


// ── 11. MAP VISUALISATIONS ────────────────────────────────────────────────────

Map.addLayer(s2Image_medellin,
  {min:0, max:0.3, bands:['B4','B3','B2']}, 'Medellín RGB (after)');
Map.addLayer(s2Image_medellin_before,
  {min:0, max:0.3, bands:['B4','B3','B2']}, 'Medellín RGB (before)');
Map.addLayer(s2Image_medellin.select('NDVI'),
  {min:0, max:0.8, palette:['red','yellow','green']}, 'Medellín NDVI');
Map.addLayer(allGCPs_medellin.filter(ee.Filter.eq('LC',0)),
  {color:'red'},        'Medellín GCPs – Non-Vegetation');
Map.addLayer(allGCPs_medellin.filter(ee.Filter.eq('LC',1)),
  {color:'green'},      'Medellín GCPs – Vegetation');
Map.addLayer(s2Image_bogota,
  {min:0, max:0.3, bands:['B4','B3','B2']}, 'Bogotá RGB');
Map.addLayer(allGCPs_bogota.filter(ee.Filter.eq('LC',0)),
  {color:'orange'},     'Bogotá GCPs – Non-Vegetation');
Map.addLayer(allGCPs_bogota.filter(ee.Filter.eq('LC',1)),
  {color:'lightgreen'}, 'Bogotá GCPs – Vegetation');


// ── 12. COMPARATIVE STATISTICS ───────────────────────────────────────────────

print('── MEAN NDVI BY CLASS ──');
['medellin','bogota'].forEach(function(city) {
  var img  = city === 'medellin' ? s2Image_medellin : s2Image_bogota;
  var gcps = city === 'medellin' ? allGCPs_medellin : allGCPs_bogota;
  [0, 1].forEach(function(cls) {
    var label = cls === 0 ? 'Non-Veg' : 'Veg';
    var mean  = img.select('NDVI').reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: gcps.filter(ee.Filter.eq('LC', cls)),
      scale: 10, maxPixels: 1e13
    });
    print(city + ' – ' + label + ':', mean.get('NDVI'));
  });
});

print('── ELEVATION RANGE ──');
print('Medellín:', elevation_medellin.reduceRegion(
  {reducer: ee.Reducer.minMax(), geometry: aoi,      scale: 30, maxPixels: 1e13}));
print('Bogotá:',   elevation_bogota.reduceRegion(
  {reducer: ee.Reducer.minMax(), geometry: aoi_test, scale: 30, maxPixels: 1e13}));

