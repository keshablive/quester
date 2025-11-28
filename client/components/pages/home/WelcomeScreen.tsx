import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  Badge, 
  Separator, 
  Icon, 
  Text, 
  QuesterLogo, 
  Avatar, 
  AvatarFallback 
} from '@/components/ui';
import { AuthModal } from '@/components/auth';
import { Link } from 'expo-router';
import {
  StarIcon,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Heart,
  CheckCircle2,
  TrendingUp,
  Users,
  Globe,
  Award,
  Code2,
  Rocket,
  Target,
  Lock,
  Smartphone,
  Cloud,
  Layers,
  Activity,
  MessageCircle,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { ScrollView } from 'react-native';
import { appConfig, Stack, Row, Container, Center } from '@/core';

const FEATURE_ITEMS = [
  { icon: Zap, title: 'Fast', description: 'Lightning-fast performance', color: 'text-amber-500' },
  {
    icon: Shield,
    title: 'Secure',
    description: 'Enterprise-grade security',
    color: 'text-blue-500',
  },
  { icon: Heart, title: 'Easy', description: 'Simple and intuitive', color: 'text-rose-500' },
];

const STATS = [
  { icon: Users, value: '10K+', label: 'Active Users' },
  { icon: Globe, value: '50+', label: 'Countries' },
  { icon: Award, value: '4.9', label: 'Rating' },
  { icon: Code2, value: '100%', label: 'Open Source' },
];

const BENEFITS = [
  { icon: Rocket, title: 'Launch Faster', description: 'Deploy in minutes, not days' },
  { icon: Target, title: 'Hit Goals', description: 'Track progress with precision' },
  { icon: Lock, title: 'Stay Private', description: 'Your data stays yours' },
  { icon: Smartphone, title: 'Mobile First', description: 'Native experience everywhere' },
];

const TECH_STACK = [
  { icon: Layers, name: 'React Native', color: 'bg-blue-500/10 text-blue-500' },
  { icon: Cloud, name: 'Cloud Ready', color: 'bg-purple-500/10 text-purple-500' },
  { icon: Activity, name: 'Real-time', color: 'bg-green-500/10 text-green-500' },
];

const TESTIMONIALS = [
  {
    avatar: 'JD',
    name: 'John Doe',
    role: 'Developer',
    quote: "Best framework I've used. Saved me weeks of development time!",
    rating: 5,
  },
  {
    avatar: 'SA',
    name: 'Sarah Anderson',
    role: 'Product Manager',
    quote: 'Intuitive and powerful. Our team loves it!',
    rating: 5,
  },
];

export function WelcomeScreen() {
  const { colorScheme } = useColorScheme();
  const [isAuthOpen, setIsAuthOpen] = React.useState(false);

  return (
    <ScrollView className="flex-1 bg-background">
      <Container size="md" centered padding>
        <Stack gap={6} align="center" className="py-12">
          {/* Hero Section with Logo */}
          <Stack gap={4} align="center">
            <QuesterLogo size={96} color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'} />

            <Stack gap={2} align="center">
              <Row gap={2} align="center">
                <Text className="text-4xl font-bold tracking-tight">
                  {appConfig.name || 'Welcome'}
                </Text>
                <Badge variant="secondary" className="flex-row gap-1">
                  <Icon as={Sparkles} size={12} />
                  <Text className="text-xs">New</Text>
                </Badge>
              </Row>
              <Text className="text-center text-lg text-muted-foreground">
                Your journey starts here
              </Text>
              
              {/* Login Button */}
              <Button 
                onPress={() => setIsAuthOpen(true)} 
                className="mt-4 w-full max-w-xs" 
                size="lg"
              >
                <Text className="font-semibold">Login</Text>
                <Icon as={ArrowRight} />
              </Button>
            </Stack>
          </Stack>

          <Separator className="my-2 w-full" />

          {/* Stats Section */}
          <Card className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardContent className="py-6">
              <Row gap={4} justify="between" wrap className="w-full">
                {STATS.map((stat, index) => (
                  <Stack key={index} gap={2} align="center" className="flex-1 min-w-[80px]">
                    <Center className="rounded-full bg-primary/10 p-2">
                      <Icon as={stat.icon} size={20} className="text-primary" />
                    </Center>
                    <Text className="text-2xl font-bold">{stat.value}</Text>
                    <Text className="text-xs text-muted-foreground text-center">{stat.label}</Text>
                  </Stack>
                ))}
              </Row>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          <Stack gap={4} className="w-full">
            {/* Feature Highlights */}
            <Row gap={3} wrap className="w-full">
              {FEATURE_ITEMS.map((feature, index) => (
                <Card key={index} className="flex-1 min-w-[150px] max-w-[300px]">
                  <CardContent className="items-center gap-2 py-6">
                    <Center className="rounded-full bg-primary/10 p-3">
                      <Icon as={feature.icon} className={feature.color} size={24} />
                    </Center>
                    <Text className="text-center font-semibold">{feature.title}</Text>
                    <Text className="text-center text-xs text-muted-foreground">
                      {feature.description}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </Row>

            {/* Testimonials */}
            <Stack gap={3}>
              <Row gap={2} align="center" className="px-2">
                <Icon as={MessageCircle} size={18} className="text-muted-foreground" />
                <Text className="font-semibold text-muted-foreground">What Users Say</Text>
              </Row>
              {TESTIMONIALS.map((testimonial, index) => (
                <Card key={index} className="bg-secondary/20">
                  <CardContent className="gap-3 py-4">
                    <Row gap={3} align="center">
                      <Avatar alt={testimonial.name} className="size-10">
                        <AvatarFallback>
                          <Text className="text-sm font-semibold">{testimonial.avatar}</Text>
                        </AvatarFallback>
                      </Avatar>
                      <Stack gap={0} className="flex-1">
                        <Text className="font-semibold">{testimonial.name}</Text>
                        <Text className="text-xs text-muted-foreground">{testimonial.role}</Text>
                      </Stack>
                      <Row gap={0.5}>
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Icon key={i} as={StarIcon} size={12} className="text-amber-500" />
                        ))}
                      </Row>
                    </Row>
                    <Text className="italic text-muted-foreground">"{testimonial.quote}"</Text>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Container>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </ScrollView>
  );
}
