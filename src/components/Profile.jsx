import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { toast } from './ui/use-toast';
import { Star, MapPin, Link as LinkIcon, Github, Twitter, Globe } from 'lucide-react';
import { ipfsHelper } from '../utils/ipfsHelper';
import { contractInteractions } from '../utils/contractInteractions';

const Profile = () => {
  const { address } = useParams(); // For public profile view
  const { address: connectedAddress, isConnected } = useAccount();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    twitter: '',
    skills: [],
    hourlyRate: '',
    avatar: '',
    completedProjects: 0,
    totalEarnings: 0,
    rating: 0,
    reviews: []
  });

  const isOwnProfile = !address || address.toLowerCase() === connectedAddress?.toLowerCase();

  useEffect(() => {
    fetchProfileData();
  }, [address, connectedAddress]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Get on-chain profile data
      const onChainProfile = await contractInteractions.getUserProfile(
        address || connectedAddress
      );

      // Get profile data from IPFS
      const ipfsData = await ipfsHelper.getProfileData(onChainProfile.ipfsHash);

      // Get reviews
      const reviews = [];
      for (let i = 0; i < onChainProfile.reviewCount; i++) {
        const review = await contractInteractions.getReview(
          address || connectedAddress,
          i
        );
        reviews.push(review);
      }

      setProfile({
        ...ipfsData,
        avatar: `https://gateway.pinata.cloud/ipfs/${onChainProfile.profileImage}`,
        completedProjects: onChainProfile.completedJobs,
        totalJobs: onChainProfile.totalJobs,
        rating: onChainProfile.averageRating,
        isVerified: onChainProfile.isVerified,
        reviews
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Upload profile image if changed
      let profileImageHash = profile.avatar;
      if (newProfileImage) {
        profileImageHash = await ipfsHelper.uploadProfileImage(newProfileImage);
      }

      // Prepare and upload profile data to IPFS
      const profileData = {
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        website: profile.website,
        github: profile.github,
        twitter: profile.twitter,
        skills: profile.skills,
        hourlyRate: profile.hourlyRate
      };

      const ipfsHash = await ipfsHelper.uploadProfileData(profileData);

      // Update profile on blockchain
      await contractInteractions.updateProfile(ipfsHash, profileImageHash);

      toast({
        title: 'Success',
        description: 'Profile updated successfully!'
      });
      
      setIsEditing(false);
      await fetchProfileData(); // Refresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const [newProfileImage, setNewProfileImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewProfileImage(file);
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar} alt={profile.name} />
              <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile.name}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="w-4 h-4 mr-1" />
                {profile.location}
              </CardDescription>
            </div>
          </div>
          {isOwnProfile && (
            <Button onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {isEditing ? (
            // Edit Mode
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (ETH)</Label>
                  <Input
                    id="hourlyRate"
                    value={profile.hourlyRate}
                    onChange={(e) => setProfile({ ...profile, hourlyRate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={profile.website}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={profile.github}
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="twitter">Twitter</Label>
                  <Input
                    id="twitter"
                    value={profile.twitter}
                    onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="avatar">Profile Image</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1"
                />
              </div>

              <Button type="submit">Save Changes</Button>
            </form>
          ) : (
            // View Mode
            <>
              <div>
                <h3 className="text-lg font-semibold mb-2">About</h3>
                <p className="text-gray-600">{profile.bio}</p>
              </div>

              <div className="flex items-center space-x-4">
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {profile.github && (
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-500">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{profile.completedProjects}</div>
                    <div className="text-sm text-gray-500">Completed Projects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{profile.totalEarnings}</div>
                    <div className="text-sm text-gray-500">Total Earnings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold flex items-center">
                      {profile.rating}
                      <Star className="w-4 h-4 text-yellow-400 ml-1" />
                    </div>
                    <div className="text-sm text-gray-500">Average Rating</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Reviews</h3>
                <div className="space-y-4">
                  {profile.reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-500">{review.client}</div>
                          <div className="flex items-center">
                            {review.rating}
                            <Star className="w-4 h-4 text-yellow-400 ml-1" />
                          </div>
                        </div>
                        <p className="text-gray-600">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <LinkIcon className="w-4 h-4" />
            <span className="text-sm">Public Profile URL:</span>
            <code className="px-2 py-1 bg-gray-100 rounded">
              {`${window.location.origin}/profile/${connectedAddress}`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/profile/${connectedAddress}`);
                toast({
                  title: "Copied!",
                  description: "Profile URL copied to clipboard"
                });
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
