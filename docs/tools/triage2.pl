# triage2.pl <B> <A> <清单> <功能段> [--detail]
# 在 triage.pl 基础上把功能性分歧再拆成「结构性新增/缺失」与「同路径改值」。
use strict; use warnings;
my ($B,$A,$list,$funcs,$detail) = @ARGV;
my %FUNC = map { $_ => 1 } split /,/, $funcs;
sub leaves {
  my $f = shift; my %out;
  local $/; open(my $fh,'<',$f) or return \%out;
  my $s = <$fh>; close $fh; $s =~ s/<\?xml.*?\?>//gs;
  my @st; my $cdepth = 0;
  while ($s =~ /<(\/?)([A-Za-z][\w-]*)\b((?:"[^"]*"|[^>"])*?)(\/?)>/gs) {
    my ($c,$t,$at,$sc) = ($1,$2,$3,$4);
    if ($c) { pop @st; $cdepth = 0 if $cdepth && scalar(@st) < $cdepth; next; }
    my ($n) = $at =~ /name="([^"]*)"/; $n = '?' unless defined $n;
    if ($sc) {
      next if $cdepth;
      push @st, $n;
      if (scalar(@st) > 1) {
        my ($v) = $at =~ /value="([^"]*)"/;
        my ($x) = $at =~ /\bx="([^"]*)"/; my ($y) = $at =~ /\by="([^"]*)"/;
        $out{ join('/', @st[1..$#st]) } = defined $v ? $v : (defined $x ? "$x,$y" : '');
      }
      pop @st; next;
    }
    push @st, $n;
    $cdepth = scalar @st if !$cdepth && $t eq 'canvas';
  }
  return \%out;
}
printf "%-36s %7s %7s %7s\n", 'FILE', 'ASM新增', 'BD新增', '改值' unless $detail;
open(my $lh,'<',$list) or die;
while (my $r = <$lh>) {
  chomp $r; next unless $r;
  my $b = leaves("$B/$r"); my $a = leaves("$A/$r");
  my (@anew,@bnew,@chg);
  for my $k (sort keys %$a) { next unless $FUNC{ (split m{[/=]},$k)[0] };
    if (!exists $b->{$k}) { push @anew,$k } elsif ($b->{$k} ne $a->{$k}) { push @chg,"$k: BD=$b->{$k} ASM=$a->{$k}" } }
  for my $k (sort keys %$b) { next unless $FUNC{ (split m{[/=]},$k)[0] };
    push @bnew,$k unless exists $a->{$k} }
  if ($detail) {
    next unless @anew || @bnew || @chg;
    print "=== $r ===\n";
    print "  [ASM 有我们无] $_ = $a->{$_}\n" for @anew;
    print "  [我们有ASM无] $_ = $b->{$_}\n" for @bnew;
    print "  [改值] $_\n" for @chg;
  } else { printf "%-36s %7d %7d %7d\n", $r, scalar @anew, scalar @bnew, scalar @chg }
}
