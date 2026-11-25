# 独立反向解题结果（多路径交叉校验 · 路径 A）

> 生成时间：2026-11-25。四个独立解题方，按域隔离，各自只读对应盲题包，
> 禁止接触 answer_key.json / reliable-data/ / apps 素材。以下为原始输出，未修改。
> 注意：独立解题也是 AI，一致只表示未发现矛盾，不构成人工签核、不解锁 verified（SPEC-008）。

## 路径 A1 · 奥赛域（reasoning 档，21 题）

```
o_binom|Q1|2ⁿ|二项式定理(1+1)ⁿ=ΣC(n,k)|NONE
o_comb_adv|Q1|67|容斥:50+33−16=67|NONE
o_comb_opt|Q1|n−3|凸n边形三角剖分得n−3条不相交对角线|需凸多边形,凹多边形可能更少
o_complex|Q1|对角线平方和=四边平方和|设边向量a,b:|a+b|²+|a−b|²=2(|a|²+|b|²)|NONE
o_cong|Q1|2|3⁶≡1(mod7),200=6·33+2⇒3²⁰⁰≡3²≡2|NONE
o_dio2|Q1|无穷多|(m²−n²,2mn,m²+n²),m>n>0为勾股数组|NONE
o_fermat|Q1|8|CRT(3,5互素):x≡2(mod3),x≡3(mod5)⇒x≡8(mod15)|NONE
o_func_eq|Q1|0|令x=y=0:f(0)=2f(0)⇒f(0)=0|NONE
o_geo_area|Q1|BD/DC=AB/AC|面积法:等高比=底比,角平分线上点到两边等距|NONE
o_geo_ceva|Q1|(BD/DC)(CE/EA)(AF/FB)=1|塞瓦定理,有向线段乘积=1⇔共点|NONE
o_geo_circle|Q1|PT₁=PT₂|圆幂:PT₁²=PA·PB=PT₂²|NONE
o_geo_ineq|Q1|等边三角形时面积最大|海伦公式+均值不等式,三边相等取最大|NONE
o_geo_trans|Q1|135°|绕B转90°,PP′=2√2,1²+(2√2)²=3²,∠=90°+45°|NONE
o_geo_vec|Q1|三高共点(垂心H=a+b+c)|以外心为原点,AH·BC=(b+c)·(c−b)=0|NONE
o_graph|Q1|成立(R(3,3)=6)|取一点,余5点中≥3点同色⇒出现同色三角形|NONE
o_induct|Q1|n(n+1)/2|归纳:基n=1,设k成立,加(k+1)得(k+1)(k+2)/2|NONE
o_ineq|Q1|a²+b²≥2ab(a=b取等)|(a−b)²≥0恒成立|NONE
o_numfun|Q1|4|12=2²·3,φ=12·(1−1/2)(1−1/3)=4|NONE
o_poly|Q1|x+1|余式ax+b:r(1)=f(1)=2,r(2)=f(2)=3⇒a=b=1|NONE
o_recur|Q1|aₙ=2ⁿ−1|令bₙ=aₙ+1,b₁=2,bₙ=2ⁿ⇒aₙ=2ⁿ−1|NONE
o_trig_id|Q1|等式成立|交叉乘:(1+sin)(1−sin)=1−sin²=cos²|需cos x≠0且1−sin x≠0
SOLVED_TOTAL=21
```

## 路径 A2 · 初中域（reasoning 档，21 题）

```
j_alg|Q1|(x²−x+1)(x²+x+1)|配方(x²+1)²−x²，用平方差|NONE
j_circle|Q1|90°|直径所对圆周角为直角|NONE
j_cong|Q1|直角三角形|3²+4²=5²，勾股逆定理|NONE
j_eq|Q1|k=2|两根和k+1=3；验Δ=9−8=1>0成立|NONE
j_frac|Q1|√3+√2|分子分母同乘√3+√2，分母=3−2=1|NONE
j_fun|Q1|x≠2（R\{2}）|分母x−2≠0|NONE
j_ineq|Q1|x<−2|两边除以−2，不等号变向|NONE
j_num|Q1|−a|a−b<0故|a−b|=b−a；√(b²)=−b(b<0)|NONE
j_prob|Q1|1/6|共36种，和为7有6种|NONE
j_quad|Q1|最小2(f(1))，最大6(f(3))|顶点x=1∈[0,3]，比较端点3与6|NONE
j_quadg|Q1|OA=OC、OB=OD(互相平分)|证△OAB≌△OCD(ASA)|NONE
j_simi|Q1|6|斜边高²=两射影之积=4×9=36|NONE
j_stats|Q1|中位数/众数(=2)更典型|100为离群值，均值被拉高|NONE
j_trans|Q1|最短=对称点到另一点距离|作对称点连线与直线交点，化折为直|无具体坐标/数据
j_tri|Q1|∠B=∠C(底角相等)|作顶角平分线证△ABD≌△ACD(SAS)|NONE
j_trig|Q1|5米|h=10·sin30°=10×1/2|NONE
o_alg_skill|Q1|7|平方得x²+2+1/x²=9，减2|NONE
o_dio|Q1|4组：(1,4)(2,3)(3,2)(4,1)|x取1~4，y=5−x|NONE
o_div0|Q1|6|2幂末位周期4，100÷4余0取第4位6|NONE
o_geo_basic|Q1|DE∥BC且DE=BC/2|三角形中位线定理|NONE
o_pigeon|Q1|成立(至少两人生日同月)|一年12月为12抽屉，13人>12|NONE
SOLVED_TOTAL=21
```

## 路径 A3 · 高中域（reasoning 档，15 题）

```
s_complex|Q1|z=1−i|z=2/(1+i)=2(1−i)/[(1+i)(1−i)]=1−i|NONE
s_conic|Q1|无法确定唯一弦长|弦长依赖椭圆方程与k,题中均未给出|椭圆方程缺失、k未定
s_count|Q1|10种|C(5,3)=5!/(3!2!)=10|NONE
s_deriv|Q1|极大值2(x=−1),极小值−2(x=1)|f′=3x²−3,驻点±1;|x|>1增、|x|<1减|NONE
s_exp|Q1|2^0.3>0.3²|2^0.3≈1.23>0.09=0.3²|NONE
s_func|Q1|奇函数|f(−x)=−x³=−f(x),定义域关于原点对称|NONE
s_ineq|Q1|最小值4|x+4/x≥2√(x·4/x)=4,等号当x=2|NONE
s_line|Q1|相交(两交点)|圆心到直线距离d=1/√2<r=√2|NONE
s_prob|Q1|期望0.5|E=1×0.5+0×0.5=0.5|NONE
s_seq|Q1|aₙ=2n+1|aₙ=Sₙ−Sₙ₋₁=2n+1,n=1时也成立|NONE
s_set|Q1|充分不必要条件|x>2⇒x>1,反之不然|NONE
s_solid|Q1|垂直于平面内两条相交直线则垂直于该平面|线面垂直判定定理|NONE
s_trig|Q1|sin3x|和角公式:sin2x cosx+cos2x sinx=sin(2x+x)|NONE
s_vec|Q1|a·b=1|a·b=|a||b|cos60°=1×2×0.5=1|NONE
s_vec3|Q1|二面角=两法向量夹角或其补角|求两平面法向量夹角,结合图形定锐钝|NONE
SOLVED_TOTAL=15
```

## 路径 A4 · 小学域（lite 档，10 题）

```
p_alg|Q1|17颗|设原有x颗，x−5=12，解得x=17|NONE
p_app|Q1|鸡5只、兔3只|假设全为鸡：8×2=16条腿，差22−16=6，兔=6÷2=3只，鸡=8−3=5只|NONE
p_count|Q1|6个|三张卡片全排列：3×2×1=6个不同三位数|NONE
p_div|Q1|能被3整除|各位数字之和1+2+3+4+5=15，15能被3整除，故12345能被3整除|NONE
p_geo|Q1|15平方厘米|梯形面积=(上底+下底)×高÷2=(4+6)×3÷2=15|NONE
p_logic|Q1|10|规律为每次加2，8之后是10，再+2得12|NONE
p_num|Q1|100000|32=4×8，25×4=100，125×8=1000，100×1000=100000|NONE
p_pigeon|Q1|至少有两人同月生日|一年12个月看作12个抽屉，13人放入，13>12，必有一月至少2人|NONE
p_ratio|Q1|36个|共2+3=5份，乙占3份，60×3/5=36|NONE
p_transform|Q1|24平方厘米|割补前后面积不变，平行四边形面积=底×高=6×4=24|NONE
SOLVED_TOTAL=10
```

**独立解题覆盖率：67/67 节点，67/67 题。**
