import local from "./.deployed-local.json" with { type: "json" };
import arbSepolia from "./.deployed-arbSepolia.json" with { type: "json" };
const map = {
    31337: local,
    421614: arbSepolia,
};
export function getDeployment(chainId) {
    const d = map[chainId];
    if (!d)
        throw new Error(`No deployment for chainId ${chainId}`);
    return d;
}
