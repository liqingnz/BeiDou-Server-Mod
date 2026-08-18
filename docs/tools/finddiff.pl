# 用法: finddiff.pl <BeiDou树根> <ASM树根> <子树名>
# 对共有文件取「标签流」的 md5（与排版、缩进、换行无关），打印内容不同的相对路径。
use strict; use warnings;
use File::Find; use Digest::MD5 qw(md5_hex);
my ($B,$A,$sub) = @ARGV;

sub sig {
  my $f = shift;
  local $/; open(my $fh,'<',$f) or return '';
  my $s = <$fh>; close $fh;
  $s =~ s/<\?xml.*?\?>//gs;
  my @toks;
  while ($s =~ /<(\/?)([A-Za-z][\w-]*)\b((?:"[^"]*"|[^>"])*?)(\/?)>/gs) {
    my ($c,$t,$at,$sc) = ($1,$2,$3,$4);
    if ($c) { push @toks, "/$t"; next; }
    # 属性排序后归一，规避两边属性顺序不同
    my @a = $at =~ /(\w+)="([^"]*)"/g;
    my %h; while (@a) { my $k=shift @a; my $v=shift @a; $h{$k}=$v; }
    push @toks, $t.'{'.join(',', map {"$_=$h{$_}"} sort keys %h).'}'.($sc?'/':'');
  }
  return md5_hex(join("\x1f",@toks));
}

my @rel;
find(sub { push @rel, $File::Find::name if -f && /\.xml$/ }, "$B/$sub");
for my $p (@rel) {
  my $r = substr($p, length($B)+1);
  my $ap = "$A/$r";
  next unless -f $ap;                      # 只看共有文件
  print "$r\n" if sig($p) ne sig($ap);
}
