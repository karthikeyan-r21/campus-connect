const Community = require("../models/Community");

exports.getAllCommunities = async (req, res) => {
  const communities = await Community.find().populate("creator");
  res.render("communities", { communities });
};

exports.getCommunityById = async (req, res) => {
  const community = await Community.findById(req.params.id)
    .populate("members")
    .populate({
      path: "posts",
      populate: { path: "user" },
    });
  res.render("communityDetail", { community });
};
