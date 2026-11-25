# 跨学段衔接映射（v2.0.0 · 零破坏）

- 机制：`o_` 五节点 ID、文件名、卡内字段（含 `module` / `pre` / `rel`）全部冻结；重划与衔接边只在本目录声明。
- 机读文件：`reliable-data/index/bridges.json`；下游如需并入图谱，由 `build-data.js` 读取合成，不回写真源卡。
- 依据：`DSN-012`、`CNF-014`、`SPEC-002` 修订说明。

## 逻辑归属重划

| nodeId | 原归属 | 新逻辑归属 | 说明 |
|---|---|---|---|
| `o_div0` | 初中竞赛衔接 | 跨学段衔接（高小→初中→奥赛） | 卡字段未改，逻辑归属在此声明 |
| `o_alg_skill` | 初中竞赛衔接 | 跨学段衔接（高小→初中→奥赛） | 卡字段未改，逻辑归属在此声明 |
| `o_pigeon` | 初中竞赛衔接 | 跨学段衔接（高小→初中→奥赛） | 卡字段未改，逻辑归属在此声明 |
| `o_dio` | 初中竞赛衔接 | 跨学段衔接（高小→初中→奥赛） | 卡字段未改，逻辑归属在此声明 |
| `o_geo_basic` | 初中竞赛衔接 | 跨学段衔接（高小→初中→奥赛） | 卡字段未改，逻辑归属在此声明 |

## 小学 → 既有节点衔接边

| 起点 | 终点 | 类型 | 说明 |
|---|---|---|---|
| `p_num` | `j_num` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_div` | `o_div0` | 铺垫→竞赛衔接 | 声明性边，未写入 cards 的 pre/rel |
| `p_alg` | `j_alg` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_alg` | `j_eq` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_ratio` | `j_frac` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_app` | `j_eq` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_geo` | `j_tri` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_geo` | `j_quadg` | 铺垫→课标 | 声明性边，未写入 cards 的 pre/rel |
| `p_transform` | `o_geo_area` | 铺垫→竞赛衔接 | 声明性边，未写入 cards 的 pre/rel |
| `p_count` | `o_pigeon` | 铺垫→竞赛衔接 | 声明性边，未写入 cards 的 pre/rel |
| `p_pigeon` | `o_pigeon` | 铺垫→竞赛衔接 | 声明性边，未写入 cards 的 pre/rel |
| `p_logic` | `o_induct` | 铺垫→奥赛 | 声明性边，未写入 cards 的 pre/rel |

> 本表只表达逻辑关系，不改变任何已发布卡的内容哈希（SPEC-002）。