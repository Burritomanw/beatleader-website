import createRankedsService from '../../../../services/scoresaber/rankeds';
import {opt} from '../../../../utils/js'

let rankeds;

export default async (data) => {
    if (rankeds === undefined) {
        rankeds = await createRankedsService().getRankeds();
    }

    if (!rankeds) return data;

    const leaderboardId = opt(data, 'leaderboard.leaderboardId');
    if (!leaderboardId) return data;

    data.leaderboard.stars = rankeds[leaderboardId] && rankeds[leaderboardId].stars ? rankeds[leaderboardId].stars : null;

    return data;
}