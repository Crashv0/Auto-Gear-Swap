import { Main } from './mod/main';
import manifest from '../../manifest.json';

export async function setup(ctx: Modding.ModContext) {
  console.log(`Auto Gear Swap+ v${manifest.version} loading...`);
  const mod = new Main(ctx);
  mod.init();
}
